import { test, expect } from '@playwright/test'
import { QA, auth, login } from './api'

/**
 * Flujo 4: suscripción a los 3 planes.
 * Contrato actual: EMPRENDEDOR es el plan gratis; el cobro de PYME / NEGOCIO_PLUS está bloqueado
 * fail-closed (409 COBRO_PLAN_NO_DISPONIBLE, "TODO: cobro por ONVO") y el plan no cambia.
 * Cuando exista cobro de planes por ONVO, este spec se actualiza con el flujo de pago de prueba.
 */
const PLANES = ['EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS'] as const
const CUENTA: Record<(typeof PLANES)[number], string> = {
  EMPRENDEDOR: QA.EMPRENDEDOR, PYME: QA.PYME, NEGOCIO_PLUS: QA.NEGOCIO_PLUS,
}

test.describe('Flujo 4 — suscripciones', () => {
  test('el catálogo público lista los 3 planes con precio coherente', async ({ request }) => {
    const planes = (await (await request.get('/api/billing/planes')).json()) as Array<{ id: number; nombre: string; precioMensual: number; tienePos: boolean }>
    expect(planes.map((p) => p.nombre)).toEqual(expect.arrayContaining([...PLANES]))
    const por = Object.fromEntries(planes.map((p) => [p.nombre, p]))
    expect(por.EMPRENDEDOR.precioMensual).toBe(0)
    expect(por.PYME.precioMensual).toBeGreaterThan(0)
    expect(por.NEGOCIO_PLUS.precioMensual).toBeGreaterThan(por.PYME.precioMensual)
  })

  for (const plan of PLANES) {
    test(`cuenta en plan ${plan} tiene el plan activo y sus límites`, async ({ request }) => {
      const s = await login(request, CUENTA[plan])
      const r = await request.get('/api/tenant/info', { headers: auth(s) })
      expect(r.ok(), await r.text()).toBeTruthy()
      const info = await r.json()
      expect(info.planNombre).toBe(plan)
      expect(info.estadoPlan).toBe('ACTIVO')
      expect(info.features?.pos).toBe(true)
      const sus = await request.get('/api/billing/suscripcion', { headers: auth(s) })
      expect(sus.ok()).toBeTruthy()
    })
  }

  for (const destino of ['PYME', 'NEGOCIO_PLUS'] as const) {
    test(`checkout a ${destino} falla cerrado sin cobrar ni cambiar el plan`, async ({ request }) => {
      const planes = (await (await request.get('/api/billing/planes')).json()) as Array<{ id: number; nombre: string }>
      const id = planes.find((p) => p.nombre === destino)!.id
      const s = await login(request, QA.EMPRENDEDOR)
      const r = await request.post(`/api/billing/checkout/${id}`, { headers: auth(s) })
      expect(r.status()).toBe(409)
      expect((await r.json()).codigo).toBe('COBRO_PLAN_NO_DISPONIBLE')
      const info = await (await request.get('/api/tenant/info', { headers: auth(s) })).json()
      expect(info.planNombre).toBe('EMPRENDEDOR')
    })
  }
})
