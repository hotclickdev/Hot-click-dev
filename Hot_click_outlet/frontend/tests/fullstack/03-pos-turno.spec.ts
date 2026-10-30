import { test, expect } from '@playwright/test'
import { QA, auth, login, sufijo } from './api'

/** Flujo 3: venta en POS con turno de caja abierto (backend real, cuenta QA PYME). */
test.describe.serial('Flujo 3 — POS con turno', () => {
  test('abre turno, crea producto, vende en efectivo, el turno suma y cierra', async ({ request }) => {
    const s = await login(request, QA.PYME)
    const h = auth(s)

    // Turno: reusar el abierto o abrir uno.
    let turno = (await (await request.get('/api/pos/caja/activo', { headers: h })).json()).data
    if (!turno) {
      const ab = await request.post('/api/pos/caja/abrir', { headers: h, data: { montoInicial: 10000 } })
      expect(ab.ok(), await ab.text()).toBeTruthy()
      turno = (await ab.json()).data
    }
    expect(turno.estado).toBe('ABIERTO')
    const efectivoAntes = turno.totalEfectivo ?? 0
    const txAntes = turno.numTransacciones ?? 0

    // Datos semilla propios del negocio: bodega + producto.
    const bod = await request.post('/api/bodegas', {
      headers: h,
      data: { nombreBodega: `Bodega E2E ${sufijo()}`, direccionExacta: 'Calle prueba 1', telefono: '88887777', provincia: 'San José', canton: 'San José' },
    })
    let bodegaId: number | undefined = bod.ok() ? (await bod.json()).data.id : undefined
    if (!bodegaId) {
      const lista = (await (await request.get('/api/bodegas', { headers: h })).json()).data
      bodegaId = (Array.isArray(lista) ? lista : lista?.content)?.[0]?.id
    }
    expect(bodegaId, 'bodega').toBeTruthy()
    const cats = (await (await request.get('/api/categorias')).json())
    const categoriaId = (cats.data?.content ?? cats.data ?? cats)[0].id
    const prod = await request.post('/api/productos', {
      headers: h,
      data: { nombreProducto: `Producto POS E2E ${sufijo()}`, precioCompra: 1000, precioVenta: 2500, stockActual: 10, stockMinimo: 0, bodegaId, categoriaId, visibleCatalogo: false },
    })
    expect(prod.ok(), await prod.text()).toBeTruthy()
    const productoId = (await prod.json()).data.id

    const venta = await request.post('/api/pos/venta', {
      headers: h,
      data: { metodoPago: 'EFECTIVO', montoRecibido: 5000, bodegaId, items: [{ productoId, cantidad: 2, precioUnitario: 2500 }] },
    })
    expect(venta.ok(), await venta.text()).toBeTruthy()
    const pedido = (await venta.json()).data
    expect(pedido.origen).toBe('POS')
    expect(pedido.totalPedido).toBe(5000)
    expect(pedido.numeroPedido).toMatch(/^POS-/)

    const despues = (await (await request.get('/api/pos/caja/activo', { headers: h })).json()).data
    expect(despues.totalEfectivo).toBe(efectivoAntes + 5000)
    expect(despues.numTransacciones).toBe(txAntes + 1)

    const cierre = await request.put(`/api/pos/caja/${despues.id}/cerrar`, {
      headers: h,
      data: { montoDeclarado: (despues.montoInicial ?? 0) + despues.totalEfectivo, notas: 'cierre e2e' },
    })
    expect(cierre.ok(), await cierre.text()).toBeTruthy()
    expect((await cierre.json()).data.estado).not.toBe('ABIERTO')
  })

  test('sin token no se puede vender', async ({ request }) => {
    const r = await request.post('/api/pos/venta', { data: { metodoPago: 'EFECTIVO', items: [] } })
    expect([401, 403]).toContain(r.status())
  })
})
