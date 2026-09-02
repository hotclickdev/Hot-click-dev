import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const ITEMS_QR = [
  { productoId: 10, nombre: 'Mouse gamer', cantidad: 1, precioUnitario: 5000, imagen: null },
  { productoId: 11, nombre: 'Teclado mecánico', cantidad: 1, precioUnitario: 12000, imagen: null },
]

async function mockPagoExpress(page: Page) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()

    if (path.includes('/pos/qr/pago/tokencarrito01/intent') && method === 'POST') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'ONVO_PUBLISHABLE_KEY no configurado' }),
      })
      return
    }

    if (path.includes('/pos/qr/pago/tokencarrito01/stripe') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ checkoutUrl: 'https://pay.onvo.test/checkout-mock' }),
      })
      return
    }

    if (path.includes('/pos/qr/pago/') && !path.endsWith('/estado') && !path.endsWith('/stripe') && !path.endsWith('/intent')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'tokencarrito01',
          estado: 'PENDIENTE',
          metodoPago: 'TARJETA',
          total: 17000,
          empresaNombre: 'Demo POS',
          items: ITEMS_QR,
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
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      functional: true,
      timestamp: Date.now(),
    }))
  })
}

test.describe('POS pago express', () => {
  test('muestra resumen y botón pagar sin ir al carrito', async ({ page }) => {
    await mockPagoExpress(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pos/pago/tokencarrito01', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/pos\/pago\/tokencarrito01/)
    await expect(page.getByText('Demo POS')).toBeVisible()
    await expect(page.getByText('Mouse gamer')).toBeVisible()
    await expect(page.getByText('Teclado mecánico')).toBeVisible()
    await expect(page.getByRole('button', { name: /Pagar/i })).toBeVisible()
  })

  test('al pulsar pagar llama al endpoint hosted', async ({ page }) => {
    await mockPagoExpress(page)
    await page.setViewportSize({ width: 390, height: 844 })

    let stripeLlamado = false
    await page.route('**/api/pos/qr/pago/tokencarrito01/stripe', async (route) => {
      stripeLlamado = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ checkoutUrl: 'https://pay.onvo.test/checkout-mock' }),
      })
    })

    await page.goto('/pos/pago/tokencarrito01', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Pagar/i }).click()
    await expect.poll(() => stripeLlamado).toBe(true)
  })

  test('QR inválido muestra botón reportar problema', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path.includes('/pos/qr/pago/')) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'QR inválido o expirado' }),
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
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pos/pago/tokeninvalido99', { waitUntil: 'domcontentloaded' })

    await expect(
      page.getByRole('button', { name: /Reportar|reportar|problema/i }),
    ).toBeVisible()
  })
})
