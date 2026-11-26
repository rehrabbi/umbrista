import { expect, test } from '@playwright/test'

function collectProblems(page: import('@playwright/test').Page): string[] {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => {
    problems.push(`pageerror: ${error.message}`)
  })
  return problems
}

test('the landing hero image loads, and the h1 comes first', async ({ page }) => {
  const problems = collectProblems(page)
  await page.goto('/')

  const hero = page.locator('.landing-scene img')
  await expect(hero).toHaveAttribute('fetchpriority', 'high')
  await expect(hero).toHaveAttribute('loading', 'eager')
  await expect
    .poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true)
  expect(await hero.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\/media\/street-dusk-\d+\.avif$/)

  const firstHeading = await page.getByRole('main').locator('h1, img').first().evaluate((el) => el.tagName)
  expect(firstHeading).toBe('H1')
  expect(problems).toEqual([])
})

test('the canvas mounts over the still when WebGL works, and the page stays quiet', async ({ page }) => {
  const problems = collectProblems(page)
  await page.goto('/')
  await expect(page.locator('.landing-scene canvas')).toHaveCount(1, { timeout: 10_000 })
  await expect(page.locator('.landing-scene img')).toBeVisible()
  expect(problems).toEqual([])
})

test('without WebGL only the still is shown, with no errors', async ({ page }) => {
  const problems = collectProblems(page)
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null
  })
  await page.goto('/')
  await expect(page.locator('.landing-scene img')).toBeVisible()
  await page.waitForTimeout(1500)
  await expect(page.locator('.landing-scene canvas')).toHaveCount(0)
  expect(problems).toEqual([])
})

test('the steam loop is muted and plays once scrolled into view', async ({ page }) => {
  await page.goto('/')
  const video = page.locator('video.landing-loop')
  await expect(video).toHaveJSProperty('muted', true)
  await video.scrollIntoViewIfNeeded()
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false)
})

test('under reduced motion the loop is its poster and there is no video element', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.landing-craft img')).toBeVisible()
  await expect(page.locator('video')).toHaveCount(0)
})
