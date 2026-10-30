import { test, expect } from '@playwright/test'
import { QA, auth, login } from './api'

/**
 * Flujo 4: suscripción a los 3 planes.
 * Contrato actual: EMPRENDEDOR es el plan gratis; el cobro de PYME / NEGOCIO_PLUS está bloqueado
 * por ONVO: en dev/test sin llave usa el mock (activa el plan local, sin cobro); fuera de
 * dev/test falla cerrado (no-OK) y el plan no cambia.
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
    test(`checkout a ${destino} no cobra: falla cerrado o mock dev/test`, async ({ request }) => {
      const planes = (await (await request.get('/api/billing/planes')).json()) as Array<{ id: number; nombre: string }>
      const id = planes.find((p) => p.nombre === destino)!.id
      const s = await login(request, QA.EMPRENDEDOR)
      const r = await request.post(`/api/billing/checkout/${id}`, { headers: auth(s) })
      const body = await r.json().catch(() => ({}))
      if (body.mock === true) {
        // Perfil dev/test sin llave ONVO: OnvoBillingClient en mock (mockPermitido() excluye prod) aplica el
        // plan local sin cobro real. Es el contrato del perfil del workflow, no un cobro.
        expect(r.status()).toBe(200)
        expect(body.proveedor).toBe('ONVO')
        expect(body.planNombre).toBe(destino)
        return
      }
      // Sin mock (fuera de dev/test): falla cerrado, sin filtrar detalles y sin cambiar el plan.
      expect(r.ok(), JSON.stringify(body)).toBeFalsy()
      expect(r.status()).not.toBe(500)
      expect(JSON.stringify(body)).not.toMatch(/exception|sk_|stack/i)
      const info = await (await request.get('/api/tenant/info', { headers: auth(s) })).json()
      expect(info.planNombre).toBe('EMPRENDEDOR')
    })
  }
})
