import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

test.describe('Pago — espera de confirmación', () => {
  test('los beneficios no usan emojis', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
        analytics: false,
        functional: true,
        timestamp: Date.now(),
      }))
    })
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    })
    await page.route('**/api/payments/status/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ estadoPago: 'PENDIENTE' }),
      })
    })

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/pago/exito?order=HC-TEST-1', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: '¡Gracias por tu compra!' })).toBeVisible()
    await expect(page.getByText('Tu compra está protegida con garantía de 40 días')).toBeVisible()
    await expect(page.getByText('🛡')).toHaveCount(0)
    await expect(page.getByText('📦')).toHaveCount(0)
    await expect(page.getByText('🚀')).toHaveCount(0)
  })
})
