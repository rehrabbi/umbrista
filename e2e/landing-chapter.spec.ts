import { expect, test, type Page } from '@playwright/test'

/*
 * Chapter 1 of the landing: the street at dusk, the lamps coming on, then the promise arriving
 * letter by letter, while the stage stays pinned. These run without the canvas (the browser's
 * software WebGL is refused), so the lamps are read from `--lamp` on the scene, which follows the
 * same progress as the canvas's lamps and dims the photograph underneath.
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

async function chapterState(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('.landing-hero')!
    const scene = document.querySelector<HTMLElement>('.landing-scene')!
    const letters = [...document.querySelectorAll<HTMLElement>('[data-letter]')]
    return {
      lamp: Number(getComputedStyle(scene).getPropertyValue('--lamp')),
      stageTop: stage.getBoundingClientRect().top,
      lettersShown: letters.filter((letter) => Number(getComputedStyle(letter).opacity) > 0.99).length,
      letters: letters.length,
    }
  })
}

/** Scroll the way a mouse wheel does, notch by notch, and let the smoothing settle. */
async function wheelTo(page: Page, y: number) {
  for (let i = 0; i < 60; i++) {
    const at = await page.evaluate(() => scrollY)
    if (at >= y - 10) break
    await page.mouse.wheel(0, Math.min(150, y - at))
    await page.waitForTimeout(60)
  }
  await page.waitForTimeout(400)
}

test('the h1 names the café and its promise before anything moves', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(`Umbrista ${PROMISE}`)
})

test('dusk first: the lamps are off and the title waits below its baseline', async ({ page }) => {
  await page.goto('/')
  await page.mouse.move(700, 400)
  const state = await chapterState(page)
  expect(state.lamp).toBe(0)
  expect(state.lettersShown).toBe(0)
  // The opening time and the line are readable from the start.
  await expect(page.getByText(/café time/)).toBeVisible()
  await expect(page.getByText('A coffee bar in Calvessa, lit from dusk until three.')).toBeVisible()
})

test('scrolling through chapter 1 keeps the stage pinned, turns the lamps on, then brings the title in', async ({ page }) => {
  const problems = collectProblems(page)
  await page.goto('/')
  await page.mouse.move(700, 400)
  const travel = await page.evaluate(() => document.querySelector<HTMLElement>('.chapter-opening')!.offsetHeight - innerHeight)
  // The scroll only arrives once the choreography has loaded; the first wheel notch asks for it.
  await page.mouse.wheel(0, 10)
  await expect.poll(() => page.evaluate(() => document.querySelector('.landing-scene')!.getAttribute('style') ?? '')).toContain('--lamp')

  await wheelTo(page, travel * 0.3)
  const partway = await chapterState(page)
  expect(partway.stageTop).toBe(0)
  expect(partway.lamp).toBeGreaterThan(0)
  expect(partway.lamp).toBeLessThan(1)
  expect(partway.lettersShown).toBe(0)

  await wheelTo(page, travel * 0.8)
  await expect.poll(async () => (await chapterState(page)).lettersShown, { timeout: 5000 }).toBe(partway.letters)
  const lit = await chapterState(page)
  expect(lit.stageTop).toBe(0)
  expect(lit.lamp).toBe(1)

  // Past the chapter the stage lets go and scrolls away with the page.
  await wheelTo(page, travel + 300)
  expect((await chapterState(page)).stageTop).toBeLessThan(0)
  expect(problems).toEqual([])
})

test('under reduced motion chapter 1 is one still screen: no pin, the title whole, the lamps on', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const section = page.locator('section[data-chapter="dusk"]')
  await expect(section).toHaveAttribute('data-motion', 'still')
  const sizes = await section.evaluate((element) => ({
    section: element.getBoundingClientRect().height,
    stage: element.querySelector('.landing-hero')!.getBoundingClientRect().height,
  }))
  expect(sizes.section).toBe(sizes.stage)
  const state = await chapterState(page)
  expect(state.lettersShown).toBe(state.letters)
  // No script sets the lamps: the photograph is shown as it is.
  await expect(page.locator('.landing-scene img')).toHaveCSS('filter', 'none')
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
  await expect(page.locator('.landing-scene')).toHaveAttribute('style', /--lamp/)
  for (let i = 1; i < log.length; i++) expect(log[i], `frame ${i}`).toBeGreaterThanOrEqual(log[i - 1]!)
  expect(log.at(-1)!).toBeGreaterThan(100)
})
