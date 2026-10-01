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
  test('Agregar usa el rojo primario de la tarjeta, no el azul de acento', async ({ page }) => {
    await mockCatalogo(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })

    const agregar = page.getByRole('button', { name: /a tu pedido/i }).first()
    await expect(agregar).toBeVisible()
    await expect(agregar).toHaveClass(/bg-hc-red-500/)

    const color = await agregar.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(color).toBe('rgb(231, 59, 51)')
    expect(color).not.toMatch(/rgb\(23,\s*71,\s*168\)/)
  })

  test('la tarjeta del catálogo mide 167x280 como en Figma', async ({ page }) => {
    await mockCatalogo(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })

    const tarjeta = page.locator('article').first()
    await expect(tarjeta).toBeVisible()
    const caja = await tarjeta.boundingBox()
    expect(caja?.width).toBeCloseTo(167, 0)
    expect(caja?.height).toBeCloseTo(280, 0)
  })
})
