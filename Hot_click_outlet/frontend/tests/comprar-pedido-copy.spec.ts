import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const PRODUCTO = {
  id: 7,
  nombre: 'Audífonos Bluetooth',
  precio: 15000,
  stock: 5,
  cantidad: 1,
  imagenUrl: null,
}

async function mockApiYSeedPedido(page: Page) {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
  await page.addInitScript((producto) => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    localStorage.setItem('hc-first-visit-ts', String(Date.now() - 3 * 24 * 60 * 60 * 1000))
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: { items: [producto], cartUpdatedAt: Date.now() },
      version: 0,
    }))
  }, PRODUCTO)
}

test.describe('Comprar — lenguaje de pedido', () => {
  test('banner de retorno y página de pedido dicen pedido, no carrito', async ({ page }) => {
    await mockApiYSeedPedido(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText(/en el pedido/i)).toBeVisible()
    const verPedido = page.getByRole('link', { name: /ver pedido/i }).first()
    await expect(verPedido).toBeVisible()
    await expect(verPedido).toHaveClass(/hc-btn-primary/)

    await page.goto('/carrito', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /pedido/i }).first()).toBeVisible()
    await expect(page.getByText(/tu carrito/i)).toHaveCount(0)
  })
})
