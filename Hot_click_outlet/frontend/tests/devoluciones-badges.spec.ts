import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

test('devoluciones explica el proceso sin emojis', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/devoluciones', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText('7 días hábiles').first()).toBeVisible()
  await expect(page.getByText('Proceso simple')).toBeVisible()
  await expect(page.getByText('📦')).toHaveCount(0)
  await expect(page.getByText('💬')).toHaveCount(0)
  await expect(page.getByText('💳')).toHaveCount(0)
})
