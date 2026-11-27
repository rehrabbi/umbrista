import { expect, test, type Page } from '@playwright/test'

/*
 * The landing's journey (owner decision 2026-11-27): the craft film as the hero, with the promise
 * rising letter by letter; the cup under the lamp, which then stays on its stage through every
 * chapter after it; the street at dusk, pinned while its lamps come on; the window; the last cup.
 * These run without a canvas (the browser's software WebGL is refused), so the street's lamps are
 * read from `--lamp` on its scene, which follows the same progress as the canvas's lamps.
 */

test.use({ viewport: { width: 1440, height: 900 } })

const PROMISE = 'We open when the light goes.'

function collectProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  return problems
}

async function lettersShown(page: Page): Promise<{ shown: number; letters: number }> {
  return page.evaluate(() => {
    const letters = [...document.querySelectorAll<HTMLElement>('[data-letter]')]
    return { shown: letters.filter((letter) => Number(getComputedStyle(letter).opacity) > 0.99).length, letters: letters.length }
  })
}

async function duskState(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.dusk-stage')!
    const scene = document.querySelector<HTMLElement>('.dusk-scene')!
    return {
      lamp: Number(getComputedStyle(scene).getPropertyValue('--lamp')),
      stageTop: stage.getBoundingClientRect().top,
    }
  })
}

/** Where a selector's top is, measured from the top of the page. */
async function pageTop(page: Page, selector: string): Promise<number> {
  return page.evaluate((s) => document.querySelector(s)!.getBoundingClientRect().top + scrollY, selector)
}

/**
 * Scroll to `y`: wheel notches most of the way (through the smoothing, as a visitor does), then the
 * last stretch directly, so a test never chases the smoothing round and round its target.
 */
async function wheelTo(page: Page, y: number) {
  for (let i = 0; i < 40; i++) {
    const at = await page.evaluate(() => scrollY)
    if (Math.abs(at - y) <= 160) break
    await page.mouse.wheel(0, Math.max(-150, Math.min(150, y - at)))
    await page.waitForTimeout(80)
  }
  // Let the smoothing come to rest before the last step, so it cannot carry the page past it.
  await page.waitForTimeout(1200)
  await page.evaluate((target) => window.scrollTo(0, target), y)
  await page.waitForTimeout(500)
}

test('the h1 names the café and its promise before anything moves', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(`Umbrista ${PROMISE}`)
})

test('the hero: the promise rises into place on its own, with the line, the time and the actions readable', async ({ page }) => {
  const problems = collectProblems(page)
  await page.goto('/')
  await expect.poll(async () => (await lettersShown(page)).shown, { timeout: 10_000 }).toBe((await lettersShown(page)).letters)
  await expect(page.getByText('A coffee bar in Calvessa, lit from dusk until three.')).toBeVisible()
  await expect(page.getByText(/café time/).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Reserve a table' }).first()).toBeVisible()
  expect(problems).toEqual([])
})

test('the cup keeps its place on screen from its chapter to the last', async ({ page }) => {
  await page.goto('/')
  await page.mouse.move(700, 400)
  for (const id of ['cup', 'dusk', 'window', 'last-cup']) {
    const top = await pageTop(page, `section[data-chapter="${id}"]`)
    // Well inside each chapter; the last one only as far as its top, where the journey ends.
    await wheelTo(page, id === 'last-cup' ? top - 60 : top + 200)
    const stage = await page.locator('.cup-stage').boundingBox()
    expect(stage!.y, id).toBe(0)
  }
})

test('scrolling through the street keeps its stage pinned and turns the lamps on', async ({ page }) => {
  const problems = collectProblems(page)
  await page.goto('/')
  await page.mouse.move(700, 400)
  // The scroll only arrives once the choreography has loaded; the first wheel notch asks for it.
  await page.mouse.wheel(0, 10)
  await expect.poll(() => page.evaluate(() => document.querySelector('.dusk-scene')!.getAttribute('style') ?? '')).toContain('--lamp')
  const top = await pageTop(page, 'section[data-chapter="dusk"]')
  const travel = await page.evaluate(() => document.querySelector<HTMLElement>('.chapter-dusk')!.offsetHeight - innerHeight)

  await wheelTo(page, top)
  expect((await duskState(page)).lamp).toBe(0)

  await wheelTo(page, top + travel * 0.4)
  const partway = await duskState(page)
  expect(partway.stageTop).toBe(0)
  expect(partway.lamp).toBeGreaterThan(0)
  expect(partway.lamp).toBeLessThan(1)

  await wheelTo(page, top + travel * 0.85)
  const lit = await duskState(page)
  expect(lit.stageTop).toBe(0)
  expect(lit.lamp).toBe(1)

  // Past the chapter the stage lets go and scrolls away with the page.
  await wheelTo(page, top + travel + 400)
  expect((await duskState(page)).stageTop).toBeLessThan(0)
  expect(problems).toEqual([])
})

test('under reduced motion the chapters are still: no pin, the title whole, the lamps on', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const { shown, letters } = await lettersShown(page)
  expect(shown).toBe(letters)
  const section = page.locator('section[data-chapter="dusk"]')
  await expect(section).toHaveAttribute('data-motion', 'still')
  const sizes = await section.evaluate((element) => ({
    section: element.getBoundingClientRect().height,
    stage: element.querySelector('.dusk-stage')!.getBoundingClientRect().height,
  }))
  expect(sizes.section).toBe(sizes.stage)
  // No script sets the lamps: the photograph is shown as it is.
  await expect(page.locator('.dusk-scene img')).toHaveCSS('filter', 'none')
})

test('the scroll never jumps back when the first wheel loads the choreography mid-scroll', async ({ page }) => {
  // A busy page never goes idle, so the visitor's first wheel is what loads GSAP, while Lenis is
  // already smoothing that same scroll: the moment the loop changes hands.
  await page.addInitScript(() => {
    window.requestIdleCallback = () => 0
  })
  await page.goto('/')
  await page.mouse.move(700, 400)
  // Let the page run on the browser's loop for a while first, so the two clocks are far apart.
  await page.waitForTimeout(1500)
  await page.evaluate(() => {
    const log: number[] = []
    ;(window as Window & { scrollLog?: number[] }).scrollLog = log
    const tick = () => {
      log.push(scrollY)
      if (log.length < 240) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 50)
    await page.waitForTimeout(40)
  }
  await expect.poll(() => page.evaluate(() => (window as Window & { scrollLog?: number[] }).scrollLog!.length)).toBe(240)
  const log = await page.evaluate(() => (window as Window & { scrollLog?: number[] }).scrollLog!)
  // The choreography did load, part way through.
  await expect(page.locator('.dusk-scene')).toHaveAttribute('style', /--lamp/)
  for (let i = 1; i < log.length; i++) expect(log[i], `frame ${i}`).toBeGreaterThanOrEqual(log[i - 1]!)
  expect(log.at(-1)!).toBeGreaterThan(100)
})
