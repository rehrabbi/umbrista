import { expect, test, type Page } from '@playwright/test'
import { compare } from './compare'
import { allowSoftwareGL, forceIntensity, withoutCup } from './software-gl'

// The clock decides night or day, so pin it: 22:00 and 13:00 in London are night and day.
test.use({ timezoneId: 'Europe/London', viewport: { width: 1440, height: 900 } })
const NIGHT = new Date('2026-11-26T22:00:00Z')
const DAY = new Date('2026-11-26T13:00:00Z')

const READY = '.dusk-scene canvas[data-backdrop="ready"]'

/**
 * The street is the third chapter (owner decision 2026-11-27). Its scene starts once the visitor has
 * shown intent and the chapter is near the screen: move the pointer, then bring the chapter into view.
 */
async function showStreet(page: Page) {
  await page.mouse.move(700, 300)
  await page.locator('.dusk-stage').scrollIntoViewIfNeeded()
}

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

// The scrim, the copy and the cup sit over both pictures; leave them out so the photograph itself is compared.
const BARE =
  '.dusk-scene::after{display:none!important}.chapter-dusk .chapter-copy,.cup-stage{visibility:hidden!important}'

/** The hero as the canvas draws it (the still hidden), then the still alone (the canvas hidden). */
async function canvasAndStill(page: Page): Promise<[Buffer, Buffer]> {
  const box = await page.locator('.dusk-scene').boundingBox()
  expect(box).not.toBeNull()
  const clip = { x: box!.x, y: box!.y, width: box!.width, height: box!.height }
  const shot = (hide: string) =>
    page.screenshot({ clip, animations: 'disabled', style: `${BARE}${hide}{visibility:hidden!important}` })
  return [await shot('.dusk-scene img'), await shot('.dusk-scene .scene-canvas')]
}

test.describe('the living background', () => {
  // Under reduced motion the scene is one still frame, drawn on demand: deterministic to compare.
  for (const [name, time] of [
    ['night', NIGHT],
    ['day', DAY],
  ] as const) {
    test(`draws the street photograph on the canvas at ${name}, lined up with the still`, async ({ page }) => {
      const problems = collectProblems(page)
      await allowSoftwareGL(page)
      await withoutCup(page)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.clock.setFixedTime(time)
      await page.goto('/')
      await showStreet(page)
      await expect(page.locator(READY)).toHaveCount(1, { timeout: 20_000 })

      const [canvas, still] = await canvasAndStill(page)
      const { meanDiff, structureDiff, deviation } = await compare(page, canvas, still)
      // Not blank: a flat or empty canvas has almost no variation.
      expect(deviation).toBeGreaterThan(15)
      // The same photograph behind the rain. The grade changes the colours, which the normalised
      // comparison discounts; the mist, drops and lamp account for what is left (measured at about
      // 0.46 at night and 0.28 by day; an unrelated picture scores about 1). Exact alignment is the
      // job of the intensity-0 test below.
      expect(structureDiff).toBeLessThan(0.7)
      expect(meanDiff).toBeLessThan(40)
      expect(problems).toEqual([])
    })
  }

  test('with the effect off, the canvas is the still to within a few levels', async ({ page }) => {
    await allowSoftwareGL(page)
    await withoutCup(page)
    await forceIntensity(page, 0)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await showStreet(page)
    await expect(page.locator(READY)).toHaveCount(1, { timeout: 20_000 })
    const [canvas, still] = await canvasAndStill(page)
    const { meanDiff, deviation } = await compare(page, canvas, still)
    expect(deviation).toBeGreaterThan(15)
    // Measured at about 1 level in 255: the same file, the same crop, the same colours.
    expect(meanDiff).toBeLessThan(3)
  })

  // Each tier compiles a different shader (no rain, one size of drop, two sizes and a finer mist).
  for (const tier of ['low', 'mid', 'high'] as const) {
    test(`compiles and runs the ${tier} tier without shader errors`, async ({ page }) => {
      const problems = collectProblems(page)
      await allowSoftwareGL(page, tier)
      await withoutCup(page)
      await page.goto('/')
      await showStreet(page)
      const canvas = page.locator(READY)
      await expect(canvas).toHaveCount(1, { timeout: 20_000 })
      await expect(canvas).toHaveAttribute('data-tier', tier)
      await page.mouse.move(700, 300)
      await page.waitForTimeout(500)
      expect(problems).toEqual([])
    })
  }
})
