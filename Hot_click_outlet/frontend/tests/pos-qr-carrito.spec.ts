import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const ITEMS_QR = [
  { productoId: 10, nombre: 'Mouse gamer', cantidad: 1, precioUnitario: 5000, imagen: null },
  { productoId: 11, nombre: 'Teclado mecánico', cantidad: 1, precioUnitario: 12000, imagen: null },
  { productoId: 12, nombre: 'Pad XL', cantidad: 2, precioUnitario: 3000, imagen: null },
]

async function mockQrACarrito(page: Page) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/pos/qr/pago/') && !path.endsWith('/estado') && !path.endsWith('/stripe')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'tokencarrito01',
          estado: 'PENDIENTE',
          metodoPago: 'TARJETA',
          total: 23000,
          empresaNombre: 'Demo',
          items: ITEMS_QR,
        }),
      })
      return
    }
    if (path.match(/\/productos\/\d+$/)) {
      const id = Number(path.split('/').pop())
      const item = ITEMS_QR.find((i) => i.productoId === id)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id,
            nombreProducto: item?.nombre ?? `Producto ${id}`,
            precioVenta: item?.precioUnitario ?? 1000,
            stockActual: 10,
            imagenPrincipalUrl: null,
          },
        }),
      })
      return
    }
    if (path.includes('/productos')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript(() => {
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.removeItem('hotclick-cart')
  })
}

test.describe('POS QR → carrito público', () => {
  test('al escanear el QR carga los 3 productos en /carrito', async ({ page }) => {
    await mockQrACarrito(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/pos/pago/tokencarrito01', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/carrito/)
    await expect(page.getByRole('heading', { name: 'Mouse gamer' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Teclado mecánico' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pad XL' })).toBeVisible()
  })
})
