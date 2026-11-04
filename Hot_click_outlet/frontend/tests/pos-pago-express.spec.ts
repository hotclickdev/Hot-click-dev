import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const ITEMS_QR = [
  { productoId: 10, nombre: 'Mouse gamer', cantidad: 1, precioUnitario: 5000, imagen: null },
  { productoId: 11, nombre: 'Teclado mecánico', cantidad: 1, precioUnitario: 12000, imagen: null },
]

/**
 * P-01: el QR de caja no cobra con tarjeta: solo SINPE (ONVO). `onCobroTarjeta` cuenta cualquier
 * POST de cobro a /pos/qr/pago/* que no sea SINPE por ONVO.
 */
async function mockPagoExpress(page: Page, opts?: { metodos?: string[]; onCobroTarjeta?: () => void }) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const req = route.request()
    if (req.method() === 'POST' && path.includes('/pos/qr/pago/') && !path.endsWith('/sinpe-onvo')) {
      opts?.onCobroTarjeta?.()
    }

    if (path.includes('/pos/qr/pago/') && !path.endsWith('/estado')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'tokencarrito01',
          estado: 'PENDIENTE',
          metodoPago: opts?.metodos?.[0] ?? 'SINPE',
          metodosHabilitados: opts?.metodos ?? ['SINPE'],
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
  test('muestra resumen y botón pagar por SINPE sin ir al carrito', async ({ page }) => {
    await mockPagoExpress(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pos/pago/tokencarrito01', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/pos\/pago\/tokencarrito01/)
    await expect(page.getByText('Demo POS')).toBeVisible()
    await expect(page.getByText('Total a pagar')).toBeVisible()
    await expect(page.getByText('Mouse gamer')).toBeVisible()
    await expect(page.getByText('Teclado mecánico')).toBeVisible()
    await expect(page.getByRole('button', { name: /Pagar/i })).toBeVisible()
    expect(page.url()).not.toContain('/carrito')
  })

  test('aunque la caja habilite TARJETA no se ofrece ni se inicia un cobro con tarjeta', async ({ page }) => {
    let llamadas = 0
    await mockPagoExpress(page, { metodos: ['TARJETA', 'SINPE'], onCobroTarjeta: () => { llamadas += 1 } })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pos/pago/tokencarrito01', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Demo POS')).toBeVisible()
    await expect(page.getByText(/tarjeta de crédito|tarjeta de débito|Card payment/i)).toHaveCount(0)
    await page.getByRole('button', { name: /Pagar/i }).click()
    expect(llamadas).toBe(0)
    expect(page.url()).not.toContain('/carrito')
  })

  test('sesión solo con TARJETA: no hay botón de pago con tarjeta', async ({ page }) => {
    let llamadas = 0
    await mockPagoExpress(page, { metodos: ['TARJETA'], onCobroTarjeta: () => { llamadas += 1 } })
    await page.goto('/pos/pago/tokencarrito01', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Demo POS')).toBeVisible()
    await expect(page.getByRole('button', { name: /Pagar/i })).toHaveCount(0)
    expect(llamadas).toBe(0)
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
