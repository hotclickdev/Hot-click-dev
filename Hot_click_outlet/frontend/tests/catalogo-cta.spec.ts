import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const PRODUCTO = {
  id: 1,
  nombre: 'Mouse óptico',
  precio: 5000,
  stock: 4,
  marcaNombre: 'Demo',
  imagenUrl: null,
}

async function mockCatalogo(page: Page) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/productos')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            content: [PRODUCTO],
            totalElements: 1,
            totalPages: 1,
            number: 0,
            size: 20,
          },
        }),
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
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
  })
}

test.describe('Catálogo — CTA de compra', () => {
  test('Agregar al pedido usa el rojo primario, no el azul de acento', async ({ page }) => {
    await mockCatalogo(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })

    const agregar = page.getByRole('button', { name: /agregar al pedido/i }).first()
    await expect(agregar).toBeVisible()
    await expect(agregar).toHaveClass(/hc-btn-primary/)
    await expect(agregar).not.toHaveClass(/hc-accent/)

    const color = await agregar.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(color).not.toBe('rgba(0, 0, 0, 0)')
    expect(color).not.toMatch(/rgb\(23,\s*71,\s*168\)/)
  })
})
