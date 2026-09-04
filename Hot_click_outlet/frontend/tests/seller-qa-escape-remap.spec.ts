import { test, expect } from '@playwright/test'
import { entrarSeller, payloadAuth } from './seller-wizard-helpers'

test.use(process.env.CI ? {} : { channel: 'chrome' })

test.describe('Seller QA — Escape modal Sucursales', () => {
  test('Escape cierra el modal de crear', async ({ page }) => {
    await page.addInitScript((auth) => {
      localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    }, payloadAuth())

    await entrarSeller(page, 'NEGOCIO_PLUS')
    await page.goto('/negocio-plus/sucursales', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Mis Sucursales' })).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: /agregar sucursal/i }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  })
})
