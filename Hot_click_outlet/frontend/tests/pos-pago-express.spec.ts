import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const ITEMS_QR = [
  { productoId: 10, nombre: 'Mouse gamer', cantidad: 1, precioUnitario: 5000, imagen: null },
  { productoId: 11, nombre: 'Teclado mecánico', cantidad: 1, precioUnitario: 12000, imagen: null },
]

/** QR de caja sin pasarela conectada: tarjeta no disponible, SINPE directo al negocio. */
async function mockPagoExpress(page: Page, opts?: { metodoPago?: 'TARJETA' | 'SINPE'; onPasarela?: () => void }) {
  const metodoPago = opts?.metodoPago ?? 'TARJETA'

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()

    if (path.endsWith('/pasarela') && method === 'POST') {
      opts?.onPasarela?.()
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'sin pasarela' }) })
      return
    }

    if (path.includes('/pos/qr/pago/') && !path.endsWith('/estado')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'tokencarrito01',
          estado: 'PENDIENTE',
          metodoPago,
          metodosHabilitados: [metodoPago],
          total: 17000,
          empresaNombre: 'Demo POS',
          sinpeNumero: '88887777',
          items: ITEMS_QR,
        }),
      })
      return
    }

    if (path.endsWith('/estado')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ estado: 'PENDIENTE' }) })
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

const TARJETA_NO_DISPONIBLE = /pago con tarjeta no está disponible|Card payment isn't available/i

test.describe('POS pago express', () => {
  test('muestra resumen sin ir al carrito y avisa que la tarjeta no está disponible', async ({ page }) => {
    let llamadas = 0
    let stripe = false
    await mockPagoExpress(page, { onPasarela: () => { llamadas += 1 } })
    await page.route('**/api/pos/qr/pago/tokencarrito01/stripe', async (route) => {
      stripe = true
      await route.fulfill({ status: 404, body: '' })
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pos/pago/tokencarrito01', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/pos\/pago\/tokencarrito01/)
    await expect(page.getByText('Demo POS')).toBeVisible()
    await expect(page.getByText('Total a pagar')).toBeVisible()
    await expect(page.getByText('Mouse gamer')).toBeVisible()
    await expect(page.getByText('Teclado mecánico')).toBeVisible()
    await expect(page.getByText(TARJETA_NO_DISPONIBLE)).toBeVisible()
    await expect(page.getByRole('button', { name: /Reportar|reportar|problema/i })).toBeVisible()
    expect(llamadas).toBe(0)
    expect(stripe).toBe(false)
    expect(page.url()).not.toContain('/carrito')
  })

  test('SINPE muestra el número del negocio y espera la confirmación del cajero', async ({ page }) => {
    await mockPagoExpress(page, { metodoPago: 'SINPE' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pos/pago/tokencarrito01', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: /Pagar con SINPE/i }).click()
    await expect(page.getByText(/8888.?7777/)).toBeVisible()
    await expect(page.getByText(/Esperando tu pago|Waiting for your payment/i)).toBeVisible()
    expect(page.url()).not.toContain('/carrito')
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
