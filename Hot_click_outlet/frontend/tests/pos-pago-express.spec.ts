import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const ITEMS_QR = [
  { productoId: 10, nombre: 'Mouse gamer', cantidad: 1, precioUnitario: 5000, imagen: null },
  { productoId: 11, nombre: 'Teclado mecánico', cantidad: 1, precioUnitario: 12000, imagen: null },
]

/** Cobro con tarjeta del QR de caja por Tilopay (ONVO/Stripe retirados del POS). */
async function mockPagoExpress(page: Page, opts?: { tilopayOk?: boolean; onTilopay?: () => void }) {
  const tilopayOk = opts?.tilopayOk === true

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()

    if (path.endsWith('/pos/qr/pago/tokencarrito01/tilopay') && method === 'POST') {
      opts?.onTilopay?.()
      if (tilopayOk) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ orderNumber: 'POSQR-1-mock', montoCrc: 17000, sdkToken: 'tlpy_sdk_mock' }),
        })
        return
      }
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Tilopay no está configurado' }),
      })
      return
    }

    if (path.includes('/pos/qr/pago/') && !path.endsWith('/estado') && !path.includes('/tilopay')) {
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
    expect(page.url()).not.toContain('/carrito')
    await expect(page.getByText('Demo POS')).toBeVisible()
    await expect(page.getByText('Total a pagar')).toBeVisible()
    await expect(page.getByText('Mouse gamer')).toBeVisible()
    await expect(page.getByText('Teclado mecánico')).toBeVisible()
    await expect(page.getByRole('button', { name: /Pagar/i })).toBeVisible()
    expect(page.url()).not.toContain('/carrito')
  })

  test('Tilopay ok monta el formulario de tarjeta y no navega al carrito', async ({ page }) => {
    let llamadas = 0
    await mockPagoExpress(page, { tilopayOk: true, onTilopay: () => { llamadas += 1 } })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pos/pago/tokencarrito01', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/pos\/pago\/tokencarrito01/)
    await expect(page.getByText('Demo POS')).toBeVisible()
    await expect.poll(() => llamadas).toBeGreaterThan(0)
    await expect(page.getByText(/No se pudo iniciar el cobro con tarjeta|Card payment could not/i)).toHaveCount(0)
    expect(page.url()).not.toContain('/carrito')
  })

  test('al pulsar pagar llama al endpoint de Tilopay (no a /stripe)', async ({ page }) => {
    let llamadas = 0
    let stripe = false
    await mockPagoExpress(page, { onTilopay: () => { llamadas += 1 } })
    await page.route('**/api/pos/qr/pago/tokencarrito01/stripe', async (route) => {
      stripe = true
      await route.fulfill({ status: 404, body: '' })
    })
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto('/pos/pago/tokencarrito01', { waitUntil: 'domcontentloaded' })
    // Al cargar se pide el cobro (StrictMode en dev puede pedirlo dos veces); falla y aparece el botón.
    await expect(page.getByText(/No se pudo iniciar el cobro con tarjeta|Card payment could not/i)).toBeVisible()
    const antes = llamadas
    expect(antes).toBeGreaterThan(0)
    await page.getByRole('button', { name: /Pagar/i }).click()
    await expect.poll(() => llamadas).toBeGreaterThan(antes)
    expect(stripe).toBe(false)
    expect(page.url()).not.toContain('/carrito')
  })

  test('si Tilopay falla, muestra error y reportar problema', async ({ page }) => {
    await mockPagoExpress(page)
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto('/pos/pago/tokencarrito01', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/No se pudo iniciar el cobro con tarjeta|Card payment could not/i)).toBeVisible()
    await page.getByRole('button', { name: /Pagar/i }).click()
    await expect(page.getByText(/No se pudo iniciar el cobro con tarjeta|Card payment could not/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Reportar|reportar|problema/i })).toBeVisible()
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
    expect(page.url()).not.toContain('/carrito')
  })
})
