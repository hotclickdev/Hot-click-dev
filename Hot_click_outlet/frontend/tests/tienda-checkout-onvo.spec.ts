import { test, expect } from '@playwright/test'

test.use(process.env.CI ? {} : { channel: 'chrome' })

// QA5 ALTO: «Confirmar pedido» de la tienda va a /api/payments/guest-checkout y redirige a ONVO (mock).
const EMPRESA = { nombreComercial: 'Demo Store', colorPrimario: '#E73B33', colorSecundario: '#152B5E', colorAcento: '#1747A8', retiro: true }
const PRODUCTO = { id: 1, nombre: 'Mouse', precio: 5000, stock: 4 }

test('checkout de tienda paga por ONVO y no usa el alta sin pago', async ({ page }) => {
  let altaSinPago = false
  let cuerpo: Record<string, unknown> | null = null
  await page.route('**/api/tienda/demo**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/pedidos')) { altaSinPago = true; await route.fulfill({ status: 500, body: '{}' }); return }
    const data = url.pathname.includes('/productos/') ? PRODUCTO : EMPRESA
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })
  })
  await page.route('**/api/public/checkout-config', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { tarjetaOnvo: true, sinpeManual: false } }),
  }))
  await page.route('**/api/payments/guest-checkout', async (route) => {
    cuerpo = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {
      numeroPedido: 'ORD-1', proveedor: 'ONVO', redirectUrl: 'https://checkout.onvopay.com/pay/mock', cancelToken: 'ct', total: 5000,
    } }) })
  })
  await page.route('https://checkout.onvopay.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>ONVO mock</h1>' }))

  await page.goto('/tienda/demo/producto/1', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Comprar ahora' }).filter({ visible: true }).click()
  await expect(page.getByRole('heading', { name: 'Finalizar pedido' })).toBeVisible()
  await page.getByRole('button', { name: /Confirmar pedido/ }).click()
  // Formulario: completa lo requerido y reintenta.
  await page.getByPlaceholder('Juan Pérez').fill('Ana Mora')
  await page.getByPlaceholder('juan@ejemplo.com').fill('ana@example.com')
  await page.getByPlaceholder('8888-8888').fill('88888888')
  await page.getByRole('radio', { name: 'Retiro en tienda' }).check()
  await page.getByRole('button', { name: /Confirmar pedido/ }).click()
  await expect(page.getByRole('heading', { name: 'ONVO mock' })).toBeVisible()
  expect(altaSinPago).toBe(false)
  expect(cuerpo).toMatchObject({ provider: 'ONVO', guestEmail: 'ana@example.com' })

  // Retorno de ONVO (#501): /pago/exito?order=…&st=… y el estado se consulta con X-Pedido-Token = st.
  let tokenEnviado: string | undefined
  await page.route('**/api/payments/status/ORD-1', async (route) => {
    tokenEnviado = route.request().headers()['x-pedido-token']
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {
      numeroPedido: 'ORD-1', estadoPago: 'CAPTURADO', estadoPedido: 'PAGADO', total: 5000,
    } }) })
  })
  await page.goto('/pago/exito?order=ORD-1&st=st-de-prueba', { waitUntil: 'domcontentloaded' })
  await expect.poll(() => tokenEnviado).toBe('st-de-prueba')
})
