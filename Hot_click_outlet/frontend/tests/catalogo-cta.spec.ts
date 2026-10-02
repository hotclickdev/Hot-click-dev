import { test, expect, type Page } from '@playwright/test'
import { colorDeToken, sinDesborde, tamanosDeCampos } from './helpers/medidasFigma'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const PRODUCTO = {
  id: 1,
  nombre: 'Mouse óptico',
  precio: 5000,
  stock: 4,
  marcaNombre: 'Demo',
  imagenUrl: null,
}

/** Mismo producto con oferta activa y sin stock escaso: la tarjeta muestra la insignia "Oferta". */
const PRODUCTO_OFERTA = { ...PRODUCTO, id: 2, precio: 6000, precioOferta: 5000, stock: 50 }

async function mockCatalogo(page: Page, producto: typeof PRODUCTO | typeof PRODUCTO_OFERTA = PRODUCTO) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/productos')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            content: [producto],
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

test.describe('P10 Home y catálogo responsive (7:2, 30:1824)', () => {
  test('390: Home sin desborde, campos sin la regla de 16 px e insignia Oferta con el token red-50', async ({ page }) => {
    await mockCatalogo(page, PRODUCTO_OFERTA)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const insignia = page.locator('article').first().getByText(/oferta/i)
    await expect(insignia).toBeVisible()
    await sinDesborde(page)
    expect(await tamanosDeCampos(page, 'input:not([type=checkbox]):not([type=range])')).not.toContain('16px')
    const fondo = await insignia.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(fondo).toBe(await colorDeToken(page, '--hc-red-50', 'backgroundColor'))
  })

  test('1440: catálogo sin desborde y casilla sin marcar con borde n/400', async ({ page }) => {
    await mockCatalogo(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/productos', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('article').first()).toBeVisible()
    await sinDesborde(page)
    const casilla = page.locator('label input[type=checkbox]:not(:checked) + span').first()
    await expect(casilla).toBeAttached()
    const borde = await casilla.evaluate((el) => getComputedStyle(el).borderColor)
    expect(borde).toBe(await colorDeToken(page, '--hc-n-400'))
  })
})
