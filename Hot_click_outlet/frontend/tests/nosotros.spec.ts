import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

test('nosotros explica valores sin emojis', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/nosotros', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Sobre nosotros' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nuestros valores' })).toBeVisible()
  await expect(page.getByText('🔒')).toHaveCount(0)
  await expect(page.getByText('💡')).toHaveCount(0)
})
