/**
 * Smoke checklist PYME + Negocio Plus (local Playwright):
 * - Ambos: /productos/nuevo (tipo) + wizard 4 pasos, /bodegas/nueva, /plan (1/3),
 *   /cobro/nuevo, /negocio, /perfil
 * - Solo PYME: /pyme/equipo → Invitar miembro (wizard)
 * - Solo Plus: /negocio-plus/sucursales → Agregar sucursal (Paso 1/3)
 * Run: pnpm exec playwright test tests/seller-wizard.spec.ts
 */
import { test, expect } from '@playwright/test'
import {
  entrarSeller,
  expectPaso,
  prefijoPorPlan,
} from './seller-wizard-helpers'

test.use(process.env.CI ? {} : { channel: 'chrome' })

test.describe('Wizard conversacional PYME', () => {
  test('agregar producto: tipo y wizard a pantalla completa', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await page.goto('/pyme/productos/nuevo', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: '¿Qué vas a vender?' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('link', { name: /Producto de catálogo/i }).click()
    await expect(page).toHaveURL(/productos\/nuevo\/catalogo/)
    await expect(page.getByTestId('cabecera-wizard-producto')).toContainText('1 de 4')
    await expect(page.getByRole('button', { name: 'Tomar foto' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Elegir de la galería' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Omitir' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pedidos' })).toHaveCount(0)
  })

  test('nueva bodega: ve progreso Paso 1 de 4', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await expectPaso(page, '/pyme/bodegas/nueva', 'Paso 1 de 4', 'Nombre de la bodega')
  })

  test('comparar planes: ve Paso 1 de 3', async ({ page }) => {
    await entrarSeller(page, 'PYME', { billingPlanes: true })
    await expectPaso(page, '/pyme/plan', 'Paso 1 de 3', 'Elegí tu plan', 20_000)
    await expect(page.getByRole('button', { name: 'Mejorar a Negocio Plus' })).toBeVisible()
  })

  test('cobro/nuevo: ve Paso 1 de 3', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await expectPaso(page, '/pyme/cobro/nuevo', 'Paso 1 de 3', 'Tipo de cuenta')
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })

  test('negocio: ve Paso 1 de 3', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await expectPaso(page, '/pyme/negocio', 'Paso 1 de 3', 'Identidad del negocio', 20_000)
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })

  test('perfil: ve Paso 1 de 3', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await expectPaso(page, '/pyme/perfil', 'Paso 1 de 3', 'Tu nombre', 20_000)
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })

  test('equipo: invite form wizard Paso 1 de 4', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await page.goto('/pyme/equipo', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Mi Equipo' })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: '+ Invitar miembro' }).click()
    await expect(page.getByText('Paso 1 de 4')).toBeVisible()
    await expect(page.getByRole('heading', { name: '¿Cómo se llama?' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })

  test('PlanPathGate redirige /emprendedor → /pyme según tenant', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await page.goto('/emprendedor/productos/nuevo', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/pyme\/productos\/nuevo/)
    await expect(page.getByRole('heading', { name: '¿Qué vas a vender?' })).toBeVisible()
  })
})

test.describe('Wizard conversacional Negocio Plus', () => {
  test('agregar producto: tipo y wizard a pantalla completa', async ({ page }) => {
    const base = prefijoPorPlan('NEGOCIO_PLUS')
    await entrarSeller(page, 'NEGOCIO_PLUS')
    await page.goto(`${base}/productos/nuevo`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: '¿Qué vas a vender?' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('link', { name: /Producto de catálogo/i }).click()
    await expect(page.getByTestId('cabecera-wizard-producto')).toContainText('1 de 4')
    await expect(page.getByRole('button', { name: 'Tomar foto' })).toBeVisible()
  })

  test('nueva bodega: ve Paso 1 de 4', async ({ page }) => {
    const base = prefijoPorPlan('NEGOCIO_PLUS')
    await entrarSeller(page, 'NEGOCIO_PLUS')
    await expectPaso(page, `${base}/bodegas/nueva`, 'Paso 1 de 4', 'Nombre de la bodega')
  })

  test('comparar planes: ve Paso 1 de 3', async ({ page }) => {
    const base = prefijoPorPlan('NEGOCIO_PLUS')
    await entrarSeller(page, 'NEGOCIO_PLUS', { billingPlanes: true })
    await expectPaso(page, `${base}/plan`, 'Paso 1 de 3', 'Elegí tu plan', 20_000)
  })

  test('cobro/nuevo: ve Paso 1 de 3', async ({ page }) => {
    const base = prefijoPorPlan('NEGOCIO_PLUS')
    await entrarSeller(page, 'NEGOCIO_PLUS')
    await expectPaso(page, `${base}/cobro/nuevo`, 'Paso 1 de 3', 'Tipo de cuenta')
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })

  test('negocio: ve Paso 1 de 3', async ({ page }) => {
    const base = prefijoPorPlan('NEGOCIO_PLUS')
    await entrarSeller(page, 'NEGOCIO_PLUS')
    await expectPaso(page, `${base}/negocio`, 'Paso 1 de 3', 'Identidad del negocio', 20_000)
  })

  test('perfil: ve Paso 1 de 3', async ({ page }) => {
    const base = prefijoPorPlan('NEGOCIO_PLUS')
    await entrarSeller(page, 'NEGOCIO_PLUS')
    await expectPaso(page, `${base}/perfil`, 'Paso 1 de 3', 'Tu nombre', 20_000)
  })

  test('sucursales: create wizard Paso 1 de 3', async ({ page }) => {
    await entrarSeller(page, 'NEGOCIO_PLUS')
    await page.goto('/negocio-plus/sucursales', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Mis Sucursales' })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: '+ Agregar sucursal' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Paso 1 de 3')).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Nombre de la sucursal' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })
})
