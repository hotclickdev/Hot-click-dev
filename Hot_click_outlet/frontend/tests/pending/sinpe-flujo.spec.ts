import { test, expect } from '@playwright/test'

/**
 * S3 stub — SINPE guest checkout + comprobante.
 * SKIP a propósito: no está en `pnpm test:e2e:ci` y no debe flakear.
 * Ver docs/AGENTES_OLA2.md y el Issue semanal [S3] E2E gap map.
 */
test.describe.skip('pending — SINPE flujo completo', () => {
  test('guest checkout SINPE pide comprobante y no cobra en Stripe', async ({ page }) => {
    await page.goto('/checkout')
    await expect(page.getByText('SINPE Móvil')).toBeVisible()
  })
})
