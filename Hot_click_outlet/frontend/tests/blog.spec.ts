import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

test('el blog vacío no usa emojis', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/blog', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Noticias y consejos' })).toBeVisible()
  await expect(page.getByText('Próximamente')).toBeVisible()
  await expect(page.getByText('📝')).toHaveCount(0)
})
