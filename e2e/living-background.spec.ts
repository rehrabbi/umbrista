import { expect, test, type Page } from '@playwright/test'

// The clock decides night or day, so pin it: 22:00 and 13:00 in London are night and day.
test.use({ timezoneId: 'Europe/London', viewport: { width: 1440, height: 900 } })
const NIGHT = new Date('2026-11-26T22:00:00Z')
const DAY = new Date('2026-11-26T13:00:00Z')

const READY = '.landing-scene canvas[data-backdrop="ready"]'

/** Console errors, page errors, and any shader trouble three reports (it warns about link logs). */
function collectProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    const shader = /THREE\.WebGLProgram|shader/i.test(text)
    if (message.type() === 'error' || (message.type() === 'warning' && shader)) problems.push(`console: ${text}`)
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  return problems
}

interface Comparison {
  /** Mean absolute difference per channel, 0..255. */
  meanDiff: number
  /**
   * Mean absolute difference of the two luminance images after each is normalised to zero mean and
   * unit deviation: a global grade cancels out, a shifted or rescaled photograph does not.
   */
  structureDiff: number
  /** Luminance deviation of the first image, 0..255: near zero when it is blank. */
  deviation: number
}

/** Compares two same-sized PNG screenshots, decoded in the page. */
async function compare(page: Page, a: Buffer, b: Buffer): Promise<Comparison> {
  return page.evaluate(
    // This function runs in the page, so its helpers live inside it: it cannot reach this module.
    async ([first, second]) => {
      // oxlint-disable-next-line unicorn/consistent-function-scoping
      const pixels = async (base64: string) => {
        const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob()
        const bitmap = await createImageBitmap(blob)
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
        const context = canvas.getContext('2d')!
        context.drawImage(bitmap, 0, 0)
        return context.getImageData(0, 0, bitmap.width, bitmap.height).data
      }
      // oxlint-disable-next-line unicorn/consistent-function-scoping
      const luma = (data: Uint8ClampedArray) => {
        const out = new Float64Array(data.length / 4)
        for (let i = 0; i < out.length; i++) {
          out[i] = 0.2126 * data[i * 4]! + 0.7152 * data[i * 4 + 1]! + 0.0722 * data[i * 4 + 2]!
        }
        let mean = 0
        for (const v of out) mean += v
        mean /= out.length
        let variance = 0
        for (const v of out) variance += (v - mean) ** 2
        return { out, mean, sd: Math.sqrt(variance / out.length) }
      }
      const [pa, pb] = await Promise.all([pixels(first), pixels(second)])
      let diff = 0
      for (let i = 0; i < pa.length; i++) {
        if (i % 4 !== 3) diff += Math.abs(pa[i]! - pb[i]!)
      }
      const la = luma(pa)
      const lb = luma(pb)
      let structure = 0
      for (let i = 0; i < la.out.length; i++) {
        structure += Math.abs((la.out[i]! - la.mean) / la.sd - (lb.out[i]! - lb.mean) / lb.sd)
      }
      return {
        meanDiff: diff / ((pa.length / 4) * 3),
        structureDiff: structure / la.out.length,
        deviation: la.sd,
      }
    },
    [a.toString('base64'), b.toString('base64')] as const,
  )
}

// The scrim and the copy sit over both pictures; leave them out so the photograph itself is compared.
const BARE = '.landing-hero::before{display:none!important}.landing-copy{visibility:hidden!important}'

/** The hero as the canvas draws it (the still hidden), then the still alone (the canvas hidden). */
async function canvasAndStill(page: Page): Promise<[Buffer, Buffer]> {
  const box = await page.locator('.landing-scene').boundingBox()
  expect(box).not.toBeNull()
  const clip = { x: box!.x, y: box!.y, width: box!.width, height: box!.height }
  const shot = (hide: string) =>
    page.screenshot({ clip, animations: 'disabled', style: `${BARE}${hide}{visibility:hidden!important}` })
  return [await shot('.landing-scene img'), await shot('.scene-canvas')]
}

test.describe('the living background', () => {
  // Under reduced motion the scene is one still frame, drawn on demand: deterministic to compare.
  for (const [name, time] of [
    ['night', NIGHT],
    ['day', DAY],
  ] as const) {
    test(`draws the street photograph on the canvas at ${name}, lined up with the still`, async ({ page }) => {
      const problems = collectProblems(page)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.clock.setFixedTime(time)
      await page.goto('/')
      await expect(page.locator(READY)).toHaveCount(1, { timeout: 20_000 })

      const [canvas, still] = await canvasAndStill(page)
      const { meanDiff, structureDiff, deviation } = await compare(page, canvas, still)
      // Not blank: a flat or empty canvas has almost no variation.
      expect(deviation).toBeGreaterThan(15)
      // The same photograph in the same place. The grade changes the colours, which the
      // normalised comparison discounts; the rain and the lamp account for what is left.
      expect(structureDiff).toBeLessThan(0.35)
      expect(meanDiff).toBeLessThan(30)
      expect(problems).toEqual([])
    })
  }

  // Each tier compiles a different shader (no rain, one size of drop, two sizes and a finer mist).
  for (const [tier, cores] of [
    ['low', 2],
    ['mid', 4],
    ['high', 16],
  ] as const) {
    test(`compiles and runs the ${tier} tier without shader errors`, async ({ page }) => {
      const problems = collectProblems(page)
      await page.addInitScript((count) => {
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => count })
      }, cores)
      await page.goto('/')
      const canvas = page.locator(READY)
      await expect(canvas).toHaveCount(1, { timeout: 20_000 })
      // The probe can rate a slow machine lower than its cores suggest, never higher.
      const drawn = await canvas.getAttribute('data-tier')
      expect(['low', 'mid', 'high'].indexOf(drawn ?? '')).toBeLessThanOrEqual(['low', 'mid', 'high'].indexOf(tier))
      await page.mouse.move(700, 300)
      await page.waitForTimeout(500)
      expect(problems).toEqual([])
    })
  }
})
