import { expect, test, type Page } from '@playwright/test'
import { compare } from './compare'
import { allowSoftwareGL } from './software-gl'

function collectProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => {
    problems.push(`pageerror: ${error.message}`)
  })
  return problems
}

/** The visitor shows intent (the scenes may start) and brings the cup's chapters near. */
async function bringCupNear(page: Page) {
  await page.mouse.move(400, 300)
  await page.locator('section[data-chapter="cup"]').scrollIntoViewIfNeeded()
}

test('the hero is the craft film: its poster loads first, edge to edge, and the h1 comes first', async ({ page }) => {
  const problems = collectProblems(page)
  await page.goto('/')

  const hero = page.locator('.hero-media img')
  await expect(hero).toHaveAttribute('fetchpriority', 'high')
  await expect(hero).toHaveAttribute('loading', 'eager')
  await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  expect(await hero.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\/media\/steam-loop-poster-\d+\.avif$/)
  // Full bleed: the poster covers the whole width of the screen.
  const box = await hero.boundingBox()
  expect(box!.x).toBe(0)
  expect(box!.width).toBe(page.viewportSize()!.width)
  expect(await page.locator('img[fetchpriority="high"]').count()).toBe(1)

  const first = await page.getByRole('main').locator('h1, img').first().evaluate((el) => el.tagName)
  expect(first).toBe('H1')
  expect(problems).toEqual([])
})

test('the film is muted, swaps in over its poster on the first intent, and plays', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('video')).toHaveCount(0)
  await page.mouse.move(400, 300)
  const video = page.locator('video.hero-film')
  await expect(video).toHaveCount(1)
  await expect(video).toHaveJSProperty('muted', true)
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false)
  await expect(video).toHaveAttribute('data-playing', '')
  const [film, poster] = await Promise.all([video.boundingBox(), page.locator('.hero-media img').boundingBox()])
  for (const key of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(film![key] - poster![key])).toBeLessThanOrEqual(1)
})

test('under reduced motion the hero is its poster and there is no video element', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.hero-media img')).toBeVisible()
  await page.waitForTimeout(500)
  await expect(page.locator('video')).toHaveCount(0)
})

test('no 3D is created for the first screen until the visitor shows intent', async ({ page }) => {
  await allowSoftwareGL(page)
  await page.goto('/')
  await page.waitForTimeout(2500)
  await expect(page.locator('canvas')).toHaveCount(0)
  await bringCupNear(page)
  await expect(page.locator('.cup-scene canvas')).toHaveCount(1, { timeout: 15_000 })
})

test('the cup fades in over its still, exactly aligned, and does not block the page', async ({ page }) => {
  const problems = collectProblems(page)
  await allowSoftwareGL(page)
  await page.goto('/')
  await bringCupNear(page)
  const host = page.locator('.cup-scene')
  await expect(host).toHaveAttribute('data-live', 'ready', { timeout: 30_000 })
  const canvas = host.locator('canvas')
  const [box, frame] = await Promise.all([canvas.boundingBox(), host.boundingBox()])
  for (const key of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(box![key] - frame![key])).toBeLessThanOrEqual(1)
  const still = await host.locator('img').boundingBox()
  for (const key of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(still![key] - frame![key])).toBeLessThanOrEqual(1)
  expect(await canvas.evaluate((el) => getComputedStyle(el.parentElement!).pointerEvents)).toBe('none')
  // The controls still answer: the buttons send their moves without errors.
  await page.getByRole('button', { name: 'Splash' }).click()
  await page.getByRole('button', { name: 'Spin' }).click()
  await page.waitForTimeout(500)
  expect(problems).toEqual([])
})

test('the live cup lands on its still: the same cup, pose and coffee, so the swap does not jump', async ({ page }) => {
  // Reduced motion: one still frame drawn on demand at the rest pose, deterministic to compare. At
  // night (the still is rendered at night), and at the high tier, with the still's shadows.
  await allowSoftwareGL(page, 'high')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.setFixedTime(new Date('2026-11-26T22:00:00Z'))
  await page.goto('/')
  await bringCupNear(page)
  const host = page.locator('.cup-scene')
  await expect(host).toHaveAttribute('data-live', 'ready', { timeout: 30_000 })
  await page.waitForTimeout(1000)
  const box = (await host.boundingBox())!
  const clip = { x: box.x, y: box.y, width: box.width, height: box.height }
  const bare = '.journey .chapter-copy{visibility:hidden!important}'
  const live = await page.screenshot({ clip, animations: 'disabled', style: `${bare}.cup-scene > picture{visibility:hidden!important}` })
  const still = await page.screenshot({
    clip,
    animations: 'disabled',
    style: `${bare}.cup-scene > picture{visibility:visible!important}.cup-scene .scene-canvas{visibility:hidden!important}`,
  })
  const { meanDiff, structureDiff, deviation } = await compare(page, live, still)
  console.log(`cup still vs canvas: meanDiff ${meanDiff.toFixed(2)}, structureDiff ${structureDiff.toFixed(3)}`)
  // Not blank, and the same cup in the same place: a different pose or coffee scores far higher.
  expect(deviation).toBeGreaterThan(10)
  expect(structureDiff).toBeLessThan(0.45)
  expect(meanDiff).toBeLessThan(20)
})

test('without WebGL the cup is its still, with no errors', async ({ page }) => {
  const problems = collectProblems(page)
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null
  })
  await page.goto('/')
  await bringCupNear(page)
  await expect(page.locator('.cup-scene img')).toBeVisible()
  await page.waitForTimeout(1500)
  await expect(page.locator('canvas')).toHaveCount(0)
  expect(problems).toEqual([])
})

test('on a software renderer the cup is its still, with no errors', async ({ page }) => {
  // This browser's WebGL is SwiftShader; without the test override the site must refuse it.
  const problems = collectProblems(page)
  await page.goto('/')
  await bringCupNear(page)
  await expect(page.locator('.cup-scene img')).toBeVisible()
  await page.waitForTimeout(1500)
  await expect(page.locator('canvas')).toHaveCount(0)
  expect(problems).toEqual([])
})

test('every chapter photograph fills the screen edge to edge', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  for (const selector of ['.hero-media', '.dusk-scene', '.chapter-window .chapter-media']) {
    const media = page.locator(selector)
    await media.scrollIntoViewIfNeeded()
    const box = await media.boundingBox()
    expect(box!.x, selector).toBe(0)
    expect(box!.width, selector).toBe(1440)
    const radius = await media.evaluate((el) => getComputedStyle(el).borderRadius)
    expect(radius, selector).toBe('0px')
  }
})
