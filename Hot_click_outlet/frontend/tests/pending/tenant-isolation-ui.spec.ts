import { test, expect } from '@playwright/test'

/**
 * S3 stub — aislamiento tenant en UI (no solo API IDOR).
 * SKIP a propósito: fuera de `test:e2e:ci`.
 */
test.describe.skip('pending — tenant isolation UI', () => {
  test('emprendedor A no ve pedidos ni finanzas de empresa B', async ({ page }) => {
    await page.goto('/admin/finanzas')
    await expect(page).toHaveURL(/login|finanzas|admin/)
  })
})
