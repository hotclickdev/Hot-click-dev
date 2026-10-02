import { test, expect, type Page } from '@playwright/test'
import { colorDeToken, sinDesborde } from './helpers/medidasFigma'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * Carrito (P04): Figma 51:1820 / 52:2178 a 390 y 30:2268 a 1440 sin desborde horizontal ni errores
 * de consola. Se conservan "Pedir por WhatsApp" y guardar por correo en escritorio (decisión pendiente).
 */
async function preparar(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: {
        items: [
          { id: 1, nombre: 'Mouse', precio: 5000, cantidad: 1, stock: 4, empresaNombre: 'Casa Luna 506', empresaId: 3 },
          { id: 2, nombre: 'Taza', precio: 6200, cantidad: 2, stock: 8, empresaNombre: 'Bruma Café', empresaId: 4 },
        ],
        cartUpdatedAt: Date.now(),
      },
      version: 0,
    }))
  })
}

for (const ancho of [390, 1440]) {
  test(`carrito a ${ancho}: sin desborde horizontal ni errores de consola`, async ({ page }) => {
    const errores: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
    page.on('pageerror', (e) => errores.push(e.message))
    await preparar(page)
    await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 900 })
    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /^Tu pedido llega en/ })).toBeVisible()

    const [scroll, cliente] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
    expect(scroll).toBeLessThanOrEqual(cliente)
    expect(errores).toEqual([])
  })
}

test('carrito a 1440 (P12): el encabezado del paquete usa n/50 (38:1359) y el header del comprador sigue en blanco', async ({ page }) => {
  await preparar(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /^Tu pedido llega en/ })).toBeVisible()

  const encabezadoPaquete = page.locator('main header.bg-hc-n-50').first()
  await expect(encabezadoPaquete).toHaveCSS('background-color', await colorDeToken(page, '--hc-n-50', 'backgroundColor'))
  await expect(page.locator('header.sticky').first()).toHaveCSS('background-color', await colorDeToken(page, '--hc-n-0', 'backgroundColor'))
  await expect(page.locator('footer').last()).toHaveCSS('background-color', await colorDeToken(page, '--hc-n-0', 'backgroundColor'))
  await sinDesborde(page)
})

test('recuperar carrito a 390: tienda y "quedan N" con la forma de GET /cart/abandoned/recover (P11, 29:2036)', async ({ page }) => {
  await preparar(page)
  await page.route('**/api/cart/abandoned/recover/tok-p11', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: 7, status: 'EMAIL_ENVIADO', items: [
        { productoId: 1, cantidad: 1, precio: 5000, nombre: 'Mouse', imagenUrl: '', stock: 2, empresaNombre: 'Casa Luna 506' },
        { productoId: 2, cantidad: 1, precio: 6200, nombre: 'Taza', imagenUrl: '', stock: 0, empresaNombre: null },
      ] } }),
    })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/recuperar-carrito/tok-p11', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText(/^Casa Luna 506 · /)).toBeVisible()
  await expect(page.getByText('Disponible · quedan 2')).toBeVisible()
  await expect(page.getByText(/Disponible · quedan 0/)).toHaveCount(0)
  await sinDesborde(page)
})
