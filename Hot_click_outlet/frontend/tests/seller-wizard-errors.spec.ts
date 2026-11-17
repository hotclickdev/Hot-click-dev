/**
 * Provocación de errores / edge en wizards PYME (local Playwright).
 * Run: pnpm exec playwright test tests/seller-wizard-errors.spec.ts
 */
import { test, expect, type Page, type Route } from '@playwright/test'
import { entrarSeller, expectPaso } from './seller-wizard-helpers'

test.use(process.env.CI ? {} : { channel: 'chrome' })

test.describe('Wizard errores / edge PYME', () => {
  test('bodega: Continuar vacío muestra role=alert', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    await expectPaso(page, '/pyme/bodegas/nueva', 'Paso 1 de 4', 'Nombre de la bodega')
    await page.getByRole('button', { name: 'Continuar' }).click()
    const alerta = page.getByRole('alert')
    await expect(alerta).toBeVisible()
    await expect(alerta).toHaveText('El nombre es obligatorio.')
    await expect(page.getByText('Paso 1 de 4')).toBeVisible()
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
    await expectPaso(page, '/pyme/bodegas/nueva', 'Paso 1 de 4', 'Nombre de la bodega')
    const continuar = page.getByRole('button', { name: 'Continuar' })
    await Promise.all([continuar.click(), continuar.click()])
    await expect(page.getByRole('alert')).toHaveCount(1)
    await expect(page.getByRole('alert')).toHaveText('El nombre es obligatorio.')
    await expect(page.getByText('Paso 1 de 4')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nombre de la bodega' })).toBeVisible()
    await expect(page.getByText('Paso 2 de 4')).toHaveCount(0)
  })

  test('reduced-motion: bodega nueva sigue mostrando Paso 1 de 4', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await entrarSeller(page, 'PYME')
    await expectPaso(page, '/pyme/bodegas/nueva', 'Paso 1 de 4', 'Nombre de la bodega')
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
  })

  test('bodega: pide teléfono, lo manda y muestra el límite del plan (403)', async ({ page }) => {
    await entrarSeller(page, 'PYME')
    let cuerpo: Record<string, unknown> | null = null
    await page.route('**/api/bodegas', async (route: Route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      cuerpo = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'LIMIT_REACHED',
          message: 'Has alcanzado el límite de bodegas de tu plan (2/2).',
          upgrade: 'Plan actual: «PYME».',
        }),
      })
    })
    // División IGN mínima: el hook la pide a GET /api/division-territorial.
    await page.route('**/api/division-territorial', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{
            nombre: 'San José',
            cantones: [{ nombre: 'San José', distritos: ['Carmen', 'Merced'] }],
          }],
        }),
      })
    })
    await expectPaso(page, '/pyme/bodegas/nueva', 'Paso 1 de 4', 'Nombre de la bodega')
    const continuar = page.getByRole('button', { name: 'Continuar' })
    await page.getByLabel('Nombre de la bodega').fill('Bodega Central')
    await continuar.click()
    await expect(page.getByText('Paso 2 de 4')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ubicación de despacho' })).toBeVisible()
    await page.getByRole('combobox', { name: /^Provincia/ }).selectOption('San José')
    await page.getByRole('combobox', { name: /^Cantón/ }).selectOption('San José')
    await expect(page.getByText('No se pudo cargar la división del IGN')).toHaveCount(0)
    await page.getByRole('combobox', { name: /^Distrito/ }).selectOption('Carmen')
    await page.getByLabel('Dirección exacta', { exact: true }).fill('San José, Costa Rica')
    await continuar.click()
    await expect(page.getByText('Paso 3 de 4')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Teléfono' })).toBeVisible()
    await continuar.click()
    await expect(page.getByRole('alert')).toHaveText('El teléfono es obligatorio.')
    // Click (no solo focus): deja el cursor después del +506 que precarga PhoneField.
    await page.getByLabel('Teléfono de la bodega').click()
    await page.keyboard.type('00000002')
    await expect(page.getByLabel('Teléfono de la bodega')).toHaveValue('+506 0000-0002')
    await continuar.click()
    await expect(page.getByText('Paso 4 de 4')).toBeVisible()
    // Guardia anti doble clic: el último paso ignora clics los primeros 600 ms (ARMADO_FINAL_MS).
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: 'Guardar bodega' }).click()
    await expect(page.getByText('Has alcanzado el límite de bodegas de tu plan (2/2).')).toBeVisible()
    expect(cuerpo).toMatchObject({
      nombreBodega: 'Bodega Central',
      provincia: 'San José',
      canton: 'San José',
      distrito: 'Carmen',
      direccionExacta: 'San José, Costa Rica',
      permiteRetiroCliente: 'false',
      telefono: '+50600000002',
    })
  })
})

async function pedidoPyme(page: Page, estado: string) {
  await entrarSeller(page, 'PYME')
  await page.route('**/api/pedidos', async (route: Route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [{ id: 41, nombreCliente: 'Ana', total: 17900, estado, items: [{ nombreProducto: 'Taza', cantidad: 1, precioUnitario: 17900 }] }],
      }),
    })
  })
  await page.goto('/pyme/pedidos/41', { waitUntil: 'domcontentloaded' })
}

test.describe('Pedido sin pago confirmado PYME (BUG-02)', () => {
  test('SINPE sin comprobante: esperando pago y sin Confirmar envío', async ({ page }) => {
    await pedidoPyme(page, 'PENDIENTE_COMPROBANTE')
    await expect(page.getByText('Esperando pago', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Podés despacharlo cuando se confirme el pago.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar envío' })).toHaveCount(0)
  })

  test('pago confirmado: Pendiente de envío con Confirmar envío', async ({ page }) => {
    await pedidoPyme(page, 'PAGADO')
    await expect(page.getByText('Pendiente de envío', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Confirmar envío' })).toBeVisible()
  })
})
