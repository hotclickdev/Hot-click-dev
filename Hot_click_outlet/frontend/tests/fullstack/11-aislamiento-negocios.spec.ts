import { test, expect } from '@playwright/test'
import { QA, auth, bodegaYProducto, login } from './api'

/**
 * Flujo 7 de la simulación final: aislamiento entre negocios (multi-tenant).
 * Negocio A = QA PYME, negocio B = QA NEGOCIO_PLUS. B no ve ni muta productos, bodegas ni pedidos de A.
 * Un acceso cruzado debe responder 403/404 (nunca 200 con datos de A, nunca 500).
 */
test.describe.serial('Flujo 7 — aislamiento entre negocios', () => {
  let hA: Record<string, string>
  let hB: Record<string, string>
  let a: { bodegaId: number; productoId: number; pedidoId: number }

  test.beforeAll(async ({ request }) => {
    const sA = await login(request, QA.PYME)
    const sB = await login(request, QA.NEGOCIO_PLUS)
    expect(sA.empresaId, 'dos negocios distintos').not.toBe(sB.empresaId)
    hA = auth(sA); hB = auth(sB)
    const { bodegaId, productoId } = await bodegaYProducto(request, hA, { visible: false, stock: 20 })
    // Pedido de A: venta POS (turno de A).
    let turno = (await (await request.get('/api/pos/caja/activo', { headers: hA })).json()).data
    if (!turno) {
      const ab = await request.post('/api/pos/caja/abrir', { headers: hA, data: { montoInicial: 1000 } })
      expect(ab.ok(), await ab.text()).toBeTruthy()
      turno = (await ab.json()).data
    }
    const v = await request.post('/api/pos/venta', {
      headers: hA, data: { metodoPago: 'EFECTIVO', montoRecibido: 2500, bodegaId, items: [{ productoId, cantidad: 1, precioUnitario: 2500 }] },
    })
    expect(v.ok(), await v.text()).toBeTruthy()
    a = { bodegaId, productoId, pedidoId: (await v.json()).data.id }
  })

  const cruzado = (st: number) => [403, 404].includes(st)

  test('B no lista los productos ni las bodegas de A', async ({ request }) => {
    const prods = await (await request.get('/api/productos/admin/todos?size=200', { headers: hB })).json()
    const ids = ((prods.data?.content ?? prods.data ?? []) as Array<{ id: number }>).map((p) => p.id)
    expect(ids).not.toContain(a.productoId)
    const bods = await (await request.get('/api/bodegas', { headers: hB })).json()
    const bid = ((Array.isArray(bods.data) ? bods.data : bods.data?.content ?? []) as Array<{ id: number }>).map((b) => b.id)
    expect(bid).not.toContain(a.bodegaId)
  })

  test('B no puede leer, editar ni borrar el producto de A', async ({ request }) => {
    const get = await request.get(`/api/productos/${a.productoId}`, { headers: hB })
    // El producto no es visible en catálogo: no se debe servir a otro negocio.
    expect(get.status(), 'GET producto ajeno').not.toBe(500)
    if (get.ok()) expect((await get.json()).data?.visibleCatalogo, 'no expone un producto oculto de A').not.toBe(false)
    const cats = await (await request.get('/api/categorias')).json()
    const categoriaId = (cats.data?.content ?? cats.data ?? cats)[0].id
    // Cuerpo VÁLIDO (si fuera inválido, un 400 de validación enmascararía una falla de aislamiento).
    const put = await request.put(`/api/productos/${a.productoId}`, { headers: hB, data: {
      nombreProducto: 'HACKEADO', precioCompra: 1, precioVenta: 1, stockActual: 1, stockMinimo: 0, bodegaId: a.bodegaId, categoriaId, visibleCatalogo: false } })
    expect(cruzado(put.status()), `PUT producto ajeno → ${put.status()}`).toBeTruthy()
    const del = await request.delete(`/api/productos/${a.productoId}`, { headers: hB })
    expect(cruzado(del.status()) || del.status() === 405, `DELETE producto ajeno → ${del.status()}`).toBeTruthy()
    const dueno = await (await request.get(`/api/productos/${a.productoId}`, { headers: hA })).json()
    expect(dueno.data.nombreProducto).not.toBe('HACKEADO')
  })

  test('B no puede leer ni mutar el pedido de A', async ({ request }) => {
    const get = await request.get(`/api/pedidos/${a.pedidoId}`, { headers: hB })
    expect(cruzado(get.status()), `GET pedido ajeno → ${get.status()}`).toBeTruthy()
    const est = await request.put(`/api/pedidos/${a.pedidoId}/estado`, { headers: hB, data: { estado: 'CANCELADO' } })
    expect(cruzado(est.status()) || est.status() === 400, `PUT estado pedido ajeno → ${est.status()}`).toBeTruthy()
    const del = await request.delete(`/api/pedidos/${a.pedidoId}`, { headers: hB })
    expect(cruzado(del.status()), `DELETE pedido ajeno → ${del.status()}`).toBeTruthy()
    const propio = await request.get(`/api/pedidos/${a.pedidoId}`, { headers: hA })
    expect(propio.ok(), 'A sí ve su pedido').toBeTruthy()
  })

  test('B no ve ventas POS de A en su historial', async ({ request }) => {
    const h = await (await request.get('/api/pos/historial?size=200', { headers: hB })).text()
    expect(h).not.toContain(`"id":${a.pedidoId},`)
  })

  test('B no puede operar el turno de caja de A', async ({ request }) => {
    const activoA = (await (await request.get('/api/pos/caja/activo', { headers: hA })).json()).data
    const r = await request.put(`/api/pos/caja/${activoA.id}/cerrar`, { headers: hB, data: { montoDeclarado: 0, notas: 'cruzado' } })
    expect(r.ok(), `cierre cruzado → ${r.status()}`).toBeFalsy()
    expect(r.status()).not.toBe(500)
  })

  test('B no puede cambiar el plan de A: el cambio de plan siempre actúa sobre la empresa del token', async ({ request }) => {
    const antes = (await (await request.get('/api/tenant/info', { headers: hA })).json()).planNombre
    const planes = (await (await request.get('/api/billing/planes')).json()) as Array<{ id: number; nombre: string }>
    // El empresaId en el cuerpo/consulta no debe influir.
    await request.post(`/api/billing/cambiar-plan/${planes.find((p) => p.nombre === 'EMPRENDEDOR')!.id}?empresaId=${(await login(request, QA.PYME)).empresaId}`, { headers: hB })
    const despues = (await (await request.get('/api/tenant/info', { headers: hA })).json()).planNombre
    expect(despues).toBe(antes)
  })
})
