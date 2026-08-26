import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const PRODUCTO = {
  id: 42,
  nombre: 'Teclado mecánico',
  precio: 12000,
  stock: 3,
  imagenUrl: null,
}

async function mockWishlist(page) {
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
    localStorage.setItem('hotclick-wishlist', JSON.stringify({ state: { items: [producto] }, version: 0 }))
  }, PRODUCTO)
}

test.describe('Wishlist — CTA de compra', () => {
  test('Agregar al pedido usa el rojo primario', async ({ page }) => {
    await mockWishlist(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/wishlist', { waitUntil: 'domcontentloaded' })

    const agregar = page.getByRole('button', { name: /agregar al pedido/i }).first()
    await expect(agregar).toBeVisible()
    await expect(agregar).toHaveClass(/hc-btn-primary/)

    const color = await agregar.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(color).not.toBe('rgba(0, 0, 0, 0)')
    expect(color).not.toMatch(/rgb\(79,\s*124,\s*255\)/)
  })
})
