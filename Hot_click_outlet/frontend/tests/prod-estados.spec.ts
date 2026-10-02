import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * Ficha de producto (P02): estados de Figma 28:839, 29:2072, 44:1775, 44:1849 y 44:1917 sin desborde
 * horizontal ni errores de consola, y el aviso de stock bajo cuando no hay selector de talla.
 */
const BASE = {
  id: 1,
  nombreProducto: 'Sofá de sala dos plazas',
  precioVenta: 17500,
  stockActual: 12,
  empresaNombre: 'Casa Luna 506',
  empresaSlug: 'casa-luna',
}

const ESTADOS: Record<string, { producto: Record<string, unknown>; variantes?: unknown[] }> = {
  general: { producto: { ...BASE, descripcion: 'Sofá tapizado a mano.' } },
  variantes: {
    producto: { ...BASE, nombreProducto: 'Tenis urbanos', precioVenta: 6200, talla: '38,39,40', colorVariante: 'Rojo', stockActual: 2, grupoVarianteId: 9 },
    variantes: [{ id: 7, colorVariante: 'Negro', stock: 4 }, { id: 8, talla: '41', stock: 0 }],
  },
  personalizado: { producto: { ...BASE, nombreProducto: 'Taza personalizada', precioVenta: 11000, esPersonalizado: true, modoPrecioPersonalizado: 'FIJO' } },
  agotado: { producto: { ...BASE, stockActual: 0 } },
}

async function abrirFicha(page: Page, producto: Record<string, unknown>, variantes: unknown[] = []) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const data = /\/api\/productos\/1$/.test(path) ? producto : path.endsWith('/variantes') ? variantes : []
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
  })
  await page.goto('/productos/1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

async function sinDesborde(page: Page) {
  const [scroll, cliente] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
  expect(scroll).toBeLessThanOrEqual(cliente)
}

test.describe('PROD - estados de la ficha', () => {
  for (const [nombre, estado] of Object.entries(ESTADOS)) {
    for (const ancho of [390, 1440]) {
      test(`${nombre} a ${ancho}: sin desborde horizontal ni errores de consola`, async ({ page }) => {
        const errores: string[] = []
        page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
        page.on('pageerror', (e) => errores.push(e.message))
        await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
        await abrirFicha(page, estado.producto, estado.variantes)
        await sinDesborde(page)
        expect(errores).toEqual([])
      })
    }
  }

  test('variantes a 390: el stock bajo se avisa en el selector de talla, no en la cabecera', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await abrirFicha(page, ESTADOS.variantes.producto, ESTADOS.variantes.variantes)
    await expect(page.getByText('Quedan 2 en talla 38')).toBeVisible()
    await expect(page.getByText(/^Quedan 2$/)).toBeHidden()
  })

  test('solo color a 390: sin selector de talla, la cabecera conserva "Quedan N"', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await abrirFicha(page, { ...BASE, nombreProducto: 'Bolso azul', colorVariante: 'Azul', stockActual: 3 })
    await expect(page.getByText('Color:')).toBeVisible()
    await expect(page.getByText(/^Quedan 3$/)).toBeVisible()
  })
})