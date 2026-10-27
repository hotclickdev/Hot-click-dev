import { test, expect } from '@playwright/test'
import { QA, auth, bodegaYProducto, login, loginUi } from './api'

/**
 * Compra (QA5). Tienda vendedora = negocio QA NEGOCIO_PLUS (empresa != 1).
 * Guest-checkout tiene 3/60s por IP: este archivo hace 2 llamadas (y 02 hace 1). No agregar más.
 * Sin ONVO de prueba en el backend el checkout termina en "ONVO no está configurado" DESPUÉS de validar
 * bodega/paquetes, así que QA5-002 se verifica igual; el 200 de punta a punta (QA5-003) requiere la llave.
 */
const conOnvo = process.env.E2E_ONVO_MODO === 'prueba'
const ONVO_OFF = /ONVO no está configurado/

test.describe.serial('Compra — QA5', () => {
  let tienda: { bodegaId: number; productoId: number; precio: number }

  test.beforeAll(async ({ request }) => {
    const s = await login(request, QA.NEGOCIO_PLUS)
    tienda = await bodegaYProducto(request, auth(s), { visible: true, retiro: true, precio: 4000 })
  })

  const invitado = (extra: Record<string, unknown>) => ({
    provider: 'ONVO',
    guestEmail: `qa5.e2e.${Date.now()}@example.test`,
    guestPhone: '88887777',
    direccionEntrega: 'San José, Calle prueba 1, casa azul',
    items: [{ productoId: tienda.productoId, cantidad: 1 }],
    ...extra,
  })

  // 3/60s por IP: si otro spec/corrida gastó el cupo, se espera la ventana una vez (no se reintenta a ciegas).
  async function guestCheckout(request: import('@playwright/test').APIRequestContext, data: Record<string, unknown>) {
    let res = await request.post('/api/payments/guest-checkout', { data })
    if (res.status() === 429) {
      test.setTimeout(150_000)
      await new Promise((r) => setTimeout(r, 61_000))
      res = await request.post('/api/payments/guest-checkout', { data })
    }
    return res
  }

  test('QA5-002: envío normal desde tienda != empresa 1 no choca con la bodega default (bodegaId=1)', async ({ request }) => {
    // Mismo payload que arma el front hoy: ya no manda bodegaId=1 por defecto (P-08), solo la bodega real por envío.
    const res = await guestCheckout(request, invitado({ metodoEnvio: 'ENVIO_NORMAL_GAM', envios: [{ bodegaId: tienda.bodegaId, metodoEnvio: 'ENVIO_NORMAL_GAM' }] }))
    const body = await res.json()
    expect(body.message ?? '').not.toMatch(/La bodega elegida no es de la tienda/)
    expect(res.status()).not.toBe(500)
    if (conOnvo) expect(res.status(), body.message).toBe(200)
    else expect(body.message).toMatch(ONVO_OFF)
  })

  test('QA5-003: checkout con bodega propia devuelve 200, sin 500 de FK del pago', async ({ request }) => {
    const res = await guestCheckout(request, invitado({ bodegaId: tienda.bodegaId, metodoEnvio: 'ENVIO_NORMAL_GAM', envios: [{ bodegaId: tienda.bodegaId, metodoEnvio: 'ENVIO_NORMAL_GAM' }] }))
    const body = await res.json()
    expect(res.status(), body.message).not.toBe(500)
    expect(JSON.stringify(body)).not.toMatch(/fkey|foreign key|HOT_CLICK_PEDIDO_TB/i)
    if (!conOnvo) {
      // Sin llave no se llega a insertar el pago: queda validado solo hasta el fail-closed de ONVO.
      expect(body.message).toMatch(ONVO_OFF)
      return
    }
    expect(res.status(), body.message).toBe(200)
    expect(body.success).toBe(true)
  })

  test('login sin errores CSP y /mis-pedidos no rebota a /login', async ({ page }) => {
    const errores: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
    page.on('pageerror', (e) => errores.push(e.message))
    await loginUi(page, QA.PYME)
    await page.goto('/mis-pedidos')
    await page.waitForTimeout(3000) // da tiempo a guards/redirects y a reportes CSP
    await expect(page).toHaveURL(/\/mis-pedidos/)
    const csp = errores.filter((e) => /Content[- ]Security[- ]Policy|Refused to (load|execute|connect|frame|apply)/i.test(e))
    expect(csp, csp.join('\n')).toEqual([])
  })

  test('checkout: envío normal viene preseleccionado', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
      localStorage.setItem('hc-mm-v1-off', '1')
    })
    await page.goto(`/productos/${tienda.productoId}`)
    await page.getByRole('button', { name: /agregar al (pedido|carrito)|añadir/i }).first().click()
    await page.goto('/checkout')
    const normal = page.locator('input[type="radio"][value^="ENVIO_NORMAL"]').first()
    await expect(normal).toBeAttached({ timeout: 15_000 })
    await expect(normal).toBeChecked()
  })

  test('E2E-CMP-01: comprador con sesión (dueño de otro negocio) puede elegir Retiro en otra tienda', async ({ request }) => {
    test.fail(true, 'E2E-CMP-01: CheckoutValidator.assertBodegaTenant compara la bodega con el empresaId del JWT → SecurityException sin capturar → 500 "No se pudo procesar el pedido"')
    const s = await login(request, QA.PYME)
    const res = await request.post('/api/payments/checkout', {
      headers: auth(s),
      data: { provider: 'ONVO', bodegaId: tienda.bodegaId, metodoEnvio: 'RETIRO_EN_TIENDA',
        envios: [{ bodegaId: tienda.bodegaId, metodoEnvio: 'RETIRO_EN_TIENDA' }], items: [{ productoId: tienda.productoId, cantidad: 1 }] },
    })
    const body = await res.json()
    expect(res.status(), body.message).not.toBe(500)
    if (!conOnvo) expect(body.message).toMatch(ONVO_OFF)
    else expect(res.status()).toBe(200)
  })

  test('Retiro + SINPE (ONVO): el pedido aparece en Mis pedidos', async ({ request }) => {
    test.skip(!conOnvo, 'Requiere ONVO de prueba (E2E_ONVO_SECRET_KEY onvo_test_): sin llave ningún checkout llega a crear el pedido')
    // Con llave, la única cuenta con sesión disponible es de negocio (registro roto: E2E-REG-01) → choca con E2E-CMP-01.
    test.fail(true, 'Bloqueado por E2E-CMP-01 / E2E-REG-01 (no hay comprador puro en el seed)')
    const s = await login(request, QA.PYME)
    const res = await request.post('/api/payments/checkout', {
      headers: auth(s),
      data: { provider: 'ONVO', bodegaId: tienda.bodegaId, metodoEnvio: 'RETIRO_EN_TIENDA',
        envios: [{ bodegaId: tienda.bodegaId, metodoEnvio: 'RETIRO_EN_TIENDA' }], items: [{ productoId: tienda.productoId, cantidad: 1 }] },
    })
    expect(res.status()).toBe(200)
    const id = (s as unknown as { id: number }).id
    const pedidos = await (await request.get(`/api/pedidos/usuario/${id}?page=0&size=20`, { headers: auth(s) })).json()
    const lista = pedidos.data?.content ?? pedidos.data ?? []
    expect(lista.some((p: { metodoEnvio?: string }) => p.metodoEnvio === 'RETIRO_EN_TIENDA')).toBeTruthy()
  })
})
