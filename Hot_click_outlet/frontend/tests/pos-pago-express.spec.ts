import { test, expect, type Page } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

const ITEMS_QR = [
  { productoId: 10, nombre: 'Mouse gamer', cantidad: 1, precioUnitario: 5000, imagen: null },
  { productoId: 11, nombre: 'Teclado mecánico', cantidad: 1, precioUnitario: 12000, imagen: null },
]

/**
 * P-01: Tilopay retirado del QR de caja. El backend responde 410 Gone en /tilopay a clientes viejos
 * y el front ya no lo llama: el QR solo cobra por SINPE (ONVO).
 */
async function mockPagoExpress(page: Page, opts?: { metodos?: string[]; onTilopay?: (status: number) => void }) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname

    if (path.includes('/pos/qr/pago/tokencarrito01/tilopay')) {
      opts?.onTilopay?.(410)
      await route.fulfill({
        status: 410,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Pago con Tilopay retirado. Pagá por SINPE Móvil o en caja.' }),
      })
      return
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

  test('Tilopay retirado: aunque la caja habilite TARJETA no se ofrece ni se llama a /tilopay', async ({ page }) => {
    let llamadas = 0
    await mockPagoExpress(page, { metodos: ['TARJETA', 'SINPE'], onTilopay: () => { llamadas += 1 } })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pos/pago/tokencarrito01', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Demo POS')).toBeVisible()
    await expect(page.getByText(/tarjeta de crédito|tarjeta de débito|Card payment/i)).toHaveCount(0)
    await page.getByRole('button', { name: /Pagar/i }).click()
    expect(llamadas).toBe(0)
    expect(page.url()).not.toContain('/carrito')
  })

  test('si un cliente viejo pega a /tilopay, el backend responde 410 Gone', async ({ page }) => {
    const estados: number[] = []
    await mockPagoExpress(page, { onTilopay: (st) => { estados.push(st) } })
    await page.goto('/pos/pago/tokencarrito01', { waitUntil: 'domcontentloaded' })
    const status = await page.evaluate(async () =>
      (await fetch('/api/pos/qr/pago/tokencarrito01/tilopay', { method: 'POST' })).status)
    expect(status).toBe(410)
    expect(estados).toEqual([410])
  })

  test('sesión solo con TARJETA: no hay botón de pago con tarjeta', async ({ page }) => {
    let llamadas = 0
    await mockPagoExpress(page, { metodos: ['TARJETA'], onTilopay: () => { llamadas += 1 } })
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
