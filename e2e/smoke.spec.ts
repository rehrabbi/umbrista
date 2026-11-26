import { expect, test } from '@playwright/test'

test('the home page loads without console errors', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => {
    problems.push(`pageerror: ${error.message}`)
  })

  const response = await page.goto('/')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('main')).toBeVisible()
  expect(problems).toEqual([])
})
