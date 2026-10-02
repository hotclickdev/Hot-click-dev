import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

async function mockHomeApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

test.describe('Home — sin emojis decorativos', () => {
  test('Servicios Hot y el pie no usan emojis', async ({ page }) => {
    await mockHomeApis(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('✦')).toHaveCount(0)
  })
})
