import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

async function mockApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

test.describe('Catálogo — asistente IA', () => {
  test('el FAB no usa el carácter de estrella', async ({ page }) => {
    await mockApis(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })

    const fab = page.getByRole('button', { name: 'Abrir asistente IA' })
    await expect(fab).toBeVisible()
    await expect(fab.getByText('¿DUDAS?')).toBeVisible()
    await expect(fab.getByText('✦')).toHaveCount(0)

    await fab.click()
    const panel = page.locator('.hc-ai-panel')
    await expect(panel.getByText('Asistente HotClick')).toBeVisible()
    await expect(page.getByText('✦')).toHaveCount(0)
    await expect(page.getByText('🛍️')).toHaveCount(0)
    await expect(page.getByText('🎉')).toHaveCount(0)
  })
})
