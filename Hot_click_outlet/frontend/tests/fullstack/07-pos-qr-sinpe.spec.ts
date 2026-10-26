import { test, expect, type APIRequestContext } from '@playwright/test'
import { QA, auth, bodegaYProducto, conSql, login, miembro, sql, type Sesion } from './api'

/** POS (QA6): QR, SINPE, Tilopay retirado, turno y historial de caja. Negocio QA NEGOCIO_PLUS + EDITOR. */
test.describe.serial('POS — QR / SINPE / caja', () => {
  let dueno: Sesion
  let editor: Sesion
  let tienda: { bodegaId: number; productoId: number; precio: number }
  const ref = () => `E2E${Date.now()}`.slice(0, 20)

  async function cerrarTurno(api: APIRequestContext, s: Sesion) {
    const t = (await (await api.get('/api/pos/caja/activo', { headers: auth(s) })).json()).data
    if (t) expect((await api.put(`/api/pos/caja/${t.id}/cerrar`, { headers: auth(s), data: { montoDeclarado: 0, notas: 'e2e' } })).ok()).toBeTruthy()
  }
  async function qr(api: APIRequestContext, s: Sesion) {
    const r = await api.post('/api/pos/qr', { headers: auth(s), data: {
      metodoPago: 'SINPE', bodegaId: tienda.bodegaId, items: [{ productoId: tienda.productoId, cantidad: 1, precioUnitario: tienda.precio }] } })
    return r
  }

  test.beforeAll(async ({ request }) => {
    dueno = await login(request, QA.NEGOCIO_PLUS)
    tienda = await bodegaYProducto(request, auth(dueno))
    const m = await miembro(request, auth(dueno), 'EDITOR')
    editor = await login(request, m.correo, m.contrasena)
  })

  test('sin turno abierto no se puede vender en efectivo', async ({ request }) => {
    await cerrarTurno(request, dueno)
    const r = await request.post('/api/pos/venta', { headers: auth(dueno), data: {
      metodoPago: 'EFECTIVO', montoRecibido: tienda.precio, bodegaId: tienda.bodegaId, items: [{ productoId: tienda.productoId, cantidad: 1, precioUnitario: tienda.precio }] } })
    expect(r.status()).toBe(400)
    expect((await r.json()).message).toMatch(/turno abierto/i)
  })

  test('E2E-POS-01: sin turno abierto tampoco se puede cobrar por QR/SINPE', async ({ request }) => {
    test.fail(true, 'E2E-POS-01: POST /api/pos/qr acepta turnoId=null y confirmar-sinpe cierra la venta (PAGADO) fuera de toda caja')
    await cerrarTurno(request, dueno)
    const r = await qr(request, dueno)
    if (r.ok()) {
      const token = (await r.json()).data.token
      const c = await request.put(`/api/pos/qr/${token}/confirmar-sinpe`, { headers: auth(editor), data: { referencia: ref() } })
      expect(c.ok(), 'confirmó una venta sin turno').toBeFalsy()
    }
    expect(r.ok(), 'creó cobro QR sin turno').toBeFalsy()
  })

  test('confirmar-sinpe: 401 sin sesión, 403 autoconfirmación, 400 sin referencia; otro usuario confirma', async ({ request }) => {
    expect((await request.post('/api/pos/caja/abrir', { headers: auth(dueno), data: { montoInicial: 1000 } })).ok()).toBeTruthy()
    const token = (await (await qr(request, dueno)).json()).data.token
    const url = `/api/pos/qr/${token}/confirmar-sinpe`
    expect((await request.put(url, { data: { referencia: ref() } })).status()).toBe(401)
    const propia = await request.put(url, { headers: auth(dueno), data: { referencia: ref() } })
    expect(propia.status()).toBe(403)
    expect((await propia.json()).data?.codigo).toBe('AUTOCONFIRMACION_SINPE')
    expect((await request.put(url, { headers: auth(editor), data: {} })).status()).toBe(400)
    const est = await (await request.get(`/api/pos/qr/pago/${token}/estado`)).json()
    expect(est.estado).toBe('PENDIENTE')
  })

  test('E2E-POS-03: SINPE solo se confirma por webhook ONVO (no a mano)', async ({ request }) => {
    test.fail(true, 'E2E-POS-03: sin intent ONVO, PUT confirmar-sinpe de otro usuario con referencia deja la venta PAGADO (confirmación manual aceptada por decisión 2026-10-22; choca con la regla pedida)')
    const token = (await (await qr(request, dueno)).json()).data.token
    const r = await request.put(`/api/pos/qr/${token}/confirmar-sinpe`, { headers: auth(editor), data: { referencia: ref() } })
    const est = await (await request.get(`/api/pos/qr/pago/${token}/estado`)).json()
    expect(est.estado, `confirmar manual respondió ${r.status()}`).not.toBe('PAGADO')
  })

  test('cada venta POS (efectivo y QR SINPE) suma al turno y aparece en historial de caja', async ({ request }) => {
    let t = (await (await request.get('/api/pos/caja/activo', { headers: auth(dueno) })).json()).data
    if (!t) t = (await (await request.post('/api/pos/caja/abrir', { headers: auth(dueno), data: { montoInicial: 1000 } })).json()).data
    const venta = await request.post('/api/pos/venta', { headers: auth(dueno), data: {
      metodoPago: 'EFECTIVO', montoRecibido: tienda.precio, bodegaId: tienda.bodegaId, items: [{ productoId: tienda.productoId, cantidad: 1, precioUnitario: tienda.precio }] } })
    expect(venta.ok(), await venta.text()).toBeTruthy()
    const numEfectivo = (await venta.json()).data.numeroPedido
    const token = (await (await qr(request, dueno)).json()).data.token
    const c = await request.put(`/api/pos/qr/${token}/confirmar-sinpe`, { headers: auth(editor), data: { referencia: ref() } })
    expect(c.ok(), await c.text()).toBeTruthy()
    const pedidoQr = (await c.json()).data.pedidoId

    const activo = (await (await request.get('/api/pos/caja/activo', { headers: auth(dueno) })).json()).data
    expect(activo.id).toBe(t.id)
    expect(activo.totalEfectivo).toBe((t.totalEfectivo ?? 0) + tienda.precio)
    expect(activo.totalSinpe).toBe((t.totalSinpe ?? 0) + tienda.precio)
    const cierre = await request.put(`/api/pos/caja/${t.id}/cerrar`, { headers: auth(dueno), data: { montoDeclarado: 0, notas: 'e2e' } })
    expect(cierre.ok()).toBeTruthy()
    const hist = (await (await request.get('/api/pos/caja/historial', { headers: auth(dueno) })).json()).data
    const turno = hist.find((x: { id: number }) => x.id === t.id)
    expect(turno?.estado).toBe('CERRADO')
    expect(turno.totalEfectivo).toBe(activo.totalEfectivo)
    expect(turno.totalSinpe).toBe(activo.totalSinpe)
    const ventas = (await (await request.get('/api/pos/historial', { headers: auth(dueno) })).json()).data
    const nums = ventas.map((v: { numeroPedido: string; id: number }) => [v.numeroPedido, v.id]).flat()
    expect(nums).toContain(numEfectivo)
    expect(nums).toContain(pedidoQr)
  })

  test('Tilopay retirado: /tilopay y /tilopay/confirmar dan 404 o 410', async ({ request }) => {
    expect((await request.post('/api/pos/qr/pago/tokenInexistenteE2E00000000000000000/tilopay')).status()).toBe(404)
    test.fail(true, 'E2E-POS-02: con token válido /tilopay responde 503 (tarjeta) o 409 (?metodo=SINPE) y /tilopay/confirmar 200 {pagado:false}; los endpoints siguen vivos')
    const t = (await (await request.post('/api/pos/caja/abrir', { headers: auth(dueno), data: { montoInicial: 0 } })).json()).data
    const token = (await (await qr(request, dueno)).json()).data.token
    await request.put(`/api/pos/caja/${t?.id}/cerrar`, { headers: auth(dueno), data: { montoDeclarado: 0, notas: 'e2e' } })
    for (const u of [`/tilopay`, `/tilopay?metodo=SINPE`, `/tilopay/confirmar`]) {
      const r = await request.post(`/api/pos/qr/pago/${token}${u}`)
      expect([404, 410], `${u} → ${r.status()}`).toContain(r.status())
    }
  })

  test('QR vencido: 404/vencido y nunca confirma la venta', async ({ request }) => {
    test.skip(!conSql, 'Requiere E2E_DATABASE_URL para vencer la sesión QR (el workflow la define)')
    const t = (await (await request.post('/api/pos/caja/abrir', { headers: auth(dueno), data: { montoInicial: 0 } })).json()).data
    const token = (await (await qr(request, dueno)).json()).data.token
    expect(token).toMatch(/^[a-f0-9]{32}$/)
    sql(`UPDATE hot_click_pos_qr_sesion_tb SET fecha_expiracion = now() - interval '1 hour' WHERE token = '${token}'`)
    const info = await request.get(`/api/pos/qr/pago/${token}`)
    if (info.status() !== 404) expect(JSON.stringify(await info.json())).toMatch(/EXPIRADO|VENCID/i)
    const c = await request.put(`/api/pos/qr/${token}/confirmar-sinpe`, { headers: auth(editor), data: { referencia: ref() } })
    expect(c.ok(), await c.text()).toBeFalsy()
    const est = await request.get(`/api/pos/qr/pago/${token}/estado`)
    if (est.ok()) expect((await est.json()).estado).not.toBe('PAGADO')
    await request.put(`/api/pos/caja/${t?.id}/cerrar`, { headers: auth(dueno), data: { montoDeclarado: 0, notas: 'e2e' } })
  })
})
