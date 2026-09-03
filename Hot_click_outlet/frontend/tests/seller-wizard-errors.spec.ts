/**
 * Provocación de errores / edge en wizards PYME (local Playwright).
 * Run: pnpm exec playwright test tests/seller-wizard-errors.spec.ts
 */
import { test, expect } from '@playwright/test'
import { entrarSeller, expectPaso } from './seller-wizard-helpers'

test.use(process.env.CI ? {} : { channel: 'chrome' })

test.describe('Wizard errores / edge PYME', () => {
  test('bodega: Continuar vacío muestra role=alert', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await expectPaso(page, '/pyme/bodegas/nueva', 'Paso 1 de 3', 'Nombre de la bodega')
    await page.getByRole('button', { name: 'Continuar' }).click()
    const alerta = page.getByRole('alert')
    await expect(alerta).toBeVisible()
    await expect(alerta).toHaveText('El nombre es obligatorio.')
    await expect(page.getByText('Paso 1 de 3')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nombre de la bodega' })).toBeVisible()
  })

  test('producto catálogo: Continuar en identidad vacía muestra alert', async ({ page }) => {
    await entrarSeller(page, 'PYME', { categorias: true })
    await page.goto('/pyme/productos/nuevo/catalogo', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Paso 2 de 5')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Foto del producto' })).toBeVisible()
    // Foto es opcional → avanza a identidad
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Paso 3 de 5')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nombre y categoría' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()
    const alerta = page.getByRole('alert')
    await expect(alerta).toBeVisible()
    await expect(alerta).toHaveText('Escribí el nombre del producto.')
    await expect(page.getByText('Paso 3 de 5')).toBeVisible()
  })

  test('bodega: doble Continuar inválido → un solo alert, sin saltar paso', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await expectPaso(page, '/pyme/bodegas/nueva', 'Paso 1 de 3', 'Nombre de la bodega')
    const continuar = page.getByRole('button', { name: 'Continuar' })
    await Promise.all([continuar.click(), continuar.click()])
    await expect(page.getByRole('alert')).toHaveCount(1)
    await expect(page.getByRole('alert')).toHaveText('El nombre es obligatorio.')
    await expect(page.getByText('Paso 1 de 3')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nombre de la bodega' })).toBeVisible()
    await expect(page.getByText('Paso 2 de 3')).toHaveCount(0)
  })

  test('reduced-motion: bodega nueva sigue mostrando Paso 1 de 3', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await entrarSeller(page, 'PYME')
    await expectPaso(page, '/pyme/bodegas/nueva', 'Paso 1 de 3', 'Nombre de la bodega')
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })
})
