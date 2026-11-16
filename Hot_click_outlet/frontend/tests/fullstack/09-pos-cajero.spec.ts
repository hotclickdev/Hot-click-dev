import { test, expect } from '@playwright/test'
import { QA, auth, bodegaYProducto, login, sufijo } from './api'

/**
 * Flujo 4 de la simulación final: POS operado por un CAJERO (rol de equipo) en el negocio PYME.
 * El cajero opera el POS (turno + venta) pero NO gestiona plan/cobros ni equipo.
 */
test.describe.serial('Flujo 4 — POS con cajero', () => {
  let cajero: { correo: string; contrasena: string }
  let bodegaId: number
  let productoId: number

  test.beforeAll(async ({ request }) => {
    const dueno = auth(await login(request, QA.PYME))
    ;({ bodegaId, productoId } = await bodegaYProducto(request, dueno, { stock: 30 }))
    const correo = `e2e.cajero.${sufijo()}@hotclick.test`
    const contrasena = `E2e-${sufijo()}-Cj1!`
    const r = await request.post('/api/empresa/equipo', {
      headers: dueno, data: { nombre: 'Cajero E2E', correo, password: contrasena, rolEnEmpresa: 'CAJERO' },
    })
    expect(r.ok(), await r.text()).toBeTruthy()
    cajero = { correo, contrasena }
  })

  test('el cajero abre turno, vende en efectivo y cierra su turno', async ({ request }) => {
    const h = auth(await login(request, cajero.correo, cajero.contrasena))
    let turno = (await (await request.get('/api/pos/caja/activo', { headers: h })).json()).data
    if (!turno) {
      const ab = await request.post('/api/pos/caja/abrir', { headers: h, data: { montoInicial: 5000 } })
      expect(ab.ok(), await ab.text()).toBeTruthy()
      turno = (await ab.json()).data
    }
    expect(turno.estado).toBe('ABIERTO')
    const venta = await request.post('/api/pos/venta', {
      headers: h, data: { metodoPago: 'EFECTIVO', montoRecibido: 5000, bodegaId, items: [{ productoId, cantidad: 2, precioUnitario: 2500 }] },
    })
    expect(venta.ok(), await venta.text()).toBeTruthy()
    const pedido = (await venta.json()).data
    expect(pedido.origen).toBe('POS')
    expect(pedido.totalPedido).toBe(5000)
    const activo = (await (await request.get('/api/pos/caja/activo', { headers: h })).json()).data
    const cierre = await request.put(`/api/pos/caja/${activo.id}/cerrar`, {
      headers: h, data: { montoDeclarado: (activo.montoInicial ?? 0) + (activo.totalEfectivo ?? 0), notas: 'cierre cajero e2e' },
    })
    expect(cierre.ok(), await cierre.text()).toBeTruthy()
  })

  test('el cajero NO puede cambiar plan, cancelar ni agregar equipo (403)', async ({ request }) => {
    const h = auth(await login(request, cajero.correo, cajero.contrasena))
    const planes = (await (await request.get('/api/billing/planes')).json()) as Array<{ id: number; nombre: string }>
    const plus = planes.find((p) => p.nombre === 'NEGOCIO_PLUS')!.id
    for (const [met, url] of [['post', `/api/billing/cambiar-plan/${plus}`], ['post', '/api/billing/cancelar'], ['get', '/api/billing/suscripcion']] as const) {
      const r = await request[met](url, { headers: h })
      expect([401, 403], `${met} ${url} → ${r.status()}`).toContain(r.status())
    }
    const eq = await request.post('/api/empresa/equipo', { headers: h, data: { nombre: 'X', correo: `x.${sufijo()}@hotclick.test`, password: `E2e-${sufijo()}-Aa1!`, rolEnEmpresa: 'LECTOR' } })
    expect([401, 403]).toContain(eq.status())
  })
})
