import { test, expect } from '@playwright/test'
import { abortarSiOnvoLive, aprobarNegocioConTrialCupo, auth, conSql, registrarNegocio, verificarCorreo, type Negocio } from './api'

/**
 * Flujos 1 y 6 de la simulación final: alta de negocio + cancelación de la prueba (trial).
 * Ambos usan el trial de 90 días del plan Emprendedor con cupo (tope 70, asignado al aprobar), NO el endpoint legado
 * de 14 días POST /api/billing/trial, que no otorga trial a nadie (fail-closed).
 * Negocio NUEVO por corrida (no toca las cuentas QA). Sin cobro: el trial local no pasa por ONVO.
 */
test.describe.serial('Flujos 1 y 6 — alta de negocio y cancelación del trial', () => {
  let n: Negocio
  test.beforeAll(() => abortarSiOnvoLive())

  test('1. alta de negocio: queda EMPRENDEDOR, sin suscripción y con su propia empresa', async ({ request }) => {
    n = await registrarNegocio(request, 'Alta')
    expect(n.sesion.rol).toBe('EMPRENDEDOR')
    const info = await (await request.get('/api/tenant/info', { headers: auth(n.sesion) })).json()
    expect(info.estadoPlan).toBe('PENDIENTE_CUPO')
    const sus = await (await request.get('/api/billing/suscripcion', { headers: auth(n.sesion) })).json()
    expect(sus.estado).toBe('SIN_SUSCRIPCION')
    expect(sus.planNombre).toBe('EMPRENDEDOR')
  })

  test('1b. alta duplicada con el mismo correo se rechaza sin 500', async ({ request }) => {
    const r = await request.post('/api/auth/registro-empresa', {
      data: { nombreEmpresa: 'Duplicado E2E', nombreAdmin: 'Admin E2E', correoAdmin: n.correo, passwordAdmin: n.contrasena,
        declaraMayoriaEdad: true, provincia: 'San José', canton: 'San José', direccionExacta: 'Calle prueba 1' },
    })
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
  })

  test('6. trial de 90 días con cupo → cancelar al vencer marca cancelarAlVencer → cancelar inmediata cierra la prueba', async ({ request }) => {
    // Sin login admin en el workflow: se emula en la BD efímera la aprobación con cupo (trial de 90 días + suscripción local).
    test.skip(!conSql, 'requiere E2E_DATABASE_URL para emular la aprobación con cupo')
    const h = auth(n.sesion)
    // El trial legado de 14 días ya no otorga nada: sin puesto (PENDIENTE_CUPO) el POST se rechaza.
    const legado = await request.post('/api/billing/trial', { headers: h })
    expect(legado.status(), `POST /api/billing/trial → ${legado.status()}`).toBeGreaterThanOrEqual(400)
    expect(legado.status()).toBeLessThan(500)
    verificarCorreo(n.correo)
    aprobarNegocioConTrialCupo(n.empresaId, n.correo)
    // El SQL no evicta tenantInfo (TTL 30s, ya cacheado en el flujo 1). Este POST es idempotente:
    // devuelve la suscripción activa, no otorga 14 días, y @CacheEvict deja ver el TRIAL fresco.
    const idem = await request.post('/api/billing/trial', { headers: h })
    expect(idem.ok(), `POST /api/billing/trial (idempotente) → ${idem.status()} ${await idem.text()}`).toBeTruthy()
    let info = await (await request.get('/api/tenant/info', { headers: h })).json()
    expect(info.estadoPlan).toBe('TRIAL')

    const alVencer = await request.post('/api/billing/cancelar', { headers: h })
    expect(alVencer.status(), await alVencer.text()).toBe(200)
    const sus = await (await request.get('/api/billing/suscripcion', { headers: h })).json()
    expect(sus.estado).toBe('TRIAL')
    expect(sus.cancelarAlVencer).toBe(true)

    const ya = await request.post('/api/billing/cancelar?inmediata=true', { headers: h })
    expect(ya.status(), await ya.text()).toBe(200)
    info = await (await request.get('/api/tenant/info', { headers: h })).json()
    expect(['TRIAL', 'ACTIVO']).not.toContain(info.estadoPlan)
  })

  test('6b. cancelar sin sesión → 401/403', async ({ request }) => {
    expect([401, 403]).toContain((await request.post('/api/billing/cancelar')).status())
  })
})
