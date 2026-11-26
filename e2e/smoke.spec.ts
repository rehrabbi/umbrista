import { expect, test } from '@playwright/test'

const ROUTES = [
  '/',
  '/menu',
  '/brew',
  '/story',
  '/visit',
  '/journal',
  '/journal/first-night',
  '/reserve',
  '/order',
  '/join',
  '/privacy',
  '/staff',
]

for (const path of ROUTES) {
  test(`${path} loads with one h1, the honesty note and no console errors`, async ({ page }) => {
    const problems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console: ${message.text()}`)
    })
    page.on('pageerror', (error) => {
      problems.push(`pageerror: ${error.message}`)
    })

    const response = await page.goto(path)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByText('Umbrista is a design project, not a real café.')).toBeVisible()
    expect(problems).toEqual([])
  })
}

test('an unknown path shows the not-found page', async ({ page }) => {
  const response = await page.goto('/nothing/here')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: 'Nothing down here but the dark.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to the bar' })).toHaveAttribute('href', '/')
})

test('following a nav link moves focus to the new page heading', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Story' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Story' })).toBeFocused()
  await expect(page).toHaveTitle('Story · Umbrista')
})
