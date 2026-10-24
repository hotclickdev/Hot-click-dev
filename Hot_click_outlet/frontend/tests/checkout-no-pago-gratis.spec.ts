import { test, expect, type Page, type Route } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

/**
 * Criterio de hecho de fix/pasarela-onvo, del lado del navegador: el checkout nunca da un pago por
 * confirmado. La tarjeta solo redirige al checkout hospedado de ONVO; efectivo queda como pago a la
 * entrega; y el retorno de ONVO solo consulta el estado (lo confirma el webhook, no el navegador).
 */

const URL_ONVO = 'https://checkout.onvopay.com/pay/cs_test_hc'

async function seedPedido(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-promo-seen', String(Date.now()))
    localStorage.setItem('hotclick-cart', JSON.stringify({
      state: {
        items: [{ id: 1, nombre: 'Mouse', precio: 5000, cantidad: 1, stock: 4, bodegaAceptaEfectivo: true }],
        cartUpdatedAt: Date.now(),
      },
      version: 0,
    }))
  })
}

function vacio(route: Route) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
}

async function llegarAlPago(page: Page) {
  await page.getByLabel('Correo').fill('ana@example.com')
  await page.getByLabel('Teléfono (WhatsApp)').fill('00000000')
  await page.getByLabel('Nombre completo').fill('Ana Pérez')
  await page.getByRole('button', { name: 'Continuar a entrega' }).click()
  await page.getByLabel('Provincia').selectOption('San José')
  await page.getByLabel('Cantón').selectOption('Escazú')
  await page.getByLabel('Señas exactas').fill('Barrio Escalante, casa 12')
  await page.getByRole('button', { name: 'Continuar al pago' }).click()
  await expect(page.getByRole('heading', { name: '¿Cómo querés pagar?' })).toBeVisible()
}

async function pagar(page: Page) {
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: /^Pagar ₡/ }).click()
}

test.describe('Checkout: nadie paga gratis', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
  })

  test('tarjeta: manda ONVO y redirige solo al checkout hospedado de ONVO', async ({ page }) => {
    const capturado: { cuerpo: Record<string, unknown> | null } = { cuerpo: null }
    await page.route('**/api/**', async (route) => {
      if (route.request().url().includes('/payments/guest-checkout')) {
        capturado.cuerpo = route.request().postDataJSON() as Record<string, unknown>
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { proveedor: 'ONVO', numeroPedido: 'ORD-ONVO-1', total: 5000, estadoPago: 'PENDIENTE', redirectUrl: URL_ONVO } }),
        })
        return
      }
      await vacio(route)
    })
    await page.route('https://checkout.onvopay.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>ONVO checkout (prueba)</h1>' }))
    await seedPedido(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await llegarAlPago(page)

    await page.getByText('Tarjeta', { exact: true }).click()
    await pagar(page)

    await page.waitForURL(/checkout\.onvopay\.com/)
    expect(capturado.cuerpo?.provider).toBe('ONVO')
  })

  test('tarjeta: si el servidor devuelve una URL ajena a ONVO, no navega', async ({ page }) => {
    const ajenas: string[] = []
    await page.route('**/api/**', async (route) => {
      if (route.request().url().includes('/payments/guest-checkout')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { proveedor: 'ONVO', numeroPedido: 'ORD-ONVO-2', total: 5000, redirectUrl: 'https://pagos-falsos.example/pay' } }),
        })
        return
      }
      await vacio(route)
    })
    await page.route('https://pagos-falsos.example/**', async (route) => {
      ajenas.push(route.request().url())
      await route.fulfill({ status: 200, contentType: 'text/html', body: 'falso' })
    })
    await seedPedido(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await llegarAlPago(page)

    await page.getByText('Tarjeta', { exact: true }).click()
    await pagar(page)

    await expect(page.getByText('No pudimos abrir la página de pago de ONVO')).toBeVisible()
    await expect(page).toHaveURL(/\/checkout/)
    expect(ajenas).toHaveLength(0)
  })

  test('efectivo: queda como pago a la entrega, sin pantalla de pago confirmado', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      if (route.request().url().includes('/sinpe/guest-checkout')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { proveedor: 'EFECTIVO', numeroPedido: 'ORD-EF-1', total: 5000, estadoPago: 'PENDIENTE', redirectUrl: null } }),
        })
        return
      }
      await vacio(route)
    })
    await seedPedido(page)
    await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
    await llegarAlPago(page)

    await page.getByText(/^(Efectivo|Contra entrega)$/).first().click()
    await pagar(page)

    await expect(page.getByRole('heading', { name: '¡Pedido registrado!' })).toBeVisible()
    await expect(page.getByText('Pagás en efectivo cuando recibas tu pedido', { exact: false })).toBeVisible()
    await expect(page.getByText('Te mandamos el comprobante')).toHaveCount(0)
  })

  test('retorno de ONVO con el pago pendiente: solo consulta el estado y no muestra pago confirmado', async ({ page }) => {
    const metodos: string[] = []
    await page.addInitScript(() => {
      localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    })
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname.includes('/payments/')) metodos.push(`${route.request().method()} ${url.pathname}`)
      if (url.pathname.includes('/payments/status/')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ estadoPago: 'PENDIENTE' }) })
        return
      }
      await vacio(route)
    })
    await page.goto('/pago/exito?order=ORD-ONVO-1', { waitUntil: 'domcontentloaded' })

    await expect.poll(() => metodos.length).toBeGreaterThan(0)
    await expect(page.getByText(/Recibimos tu pedido/)).toHaveCount(0)
    await expect(page.getByText('Te mandamos el comprobante')).toHaveCount(0)
    expect(metodos.every((m) => m.startsWith('GET '))).toBe(true)
  })
})
