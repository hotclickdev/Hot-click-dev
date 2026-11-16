import { test, expect, type Page } from '@playwright/test'
import { abortarSiOnvoLive, aprobarNegocio, auth, conOnvoPrueba, conPreciosOnvo, conSql, registrarNegocio, verificarCorreo, type Negocio } from './api'

/**
 * Flujos 2 y 5 de la simulación final: pago ONVO de prueba (tarjeta 4242) y cambio PYME → NEGOCIO_PLUS.
 * DECISIÓN DE NEGOCIO (Andrés, 15-nov-2026 18:59 America/Costa_Rica): al subir a Negocio Plus se cobra de inmediato el
 * monto COMPLETO del plan nuevo, SIN prorrateo, aunque el plan anterior ya se hubiera renovado. Esta spec solo lo VERIFICA.
 *
 * Tres modos (el que aplique lo decide el backend del sandbox):
 *  A) sin llave ONVO (mock dev/test): el cambio es local y no cobra; se verifica el contrato y que no hay 500.
 *  B) llave onvo_test_ SIN ONVO_PRICE_ID_*: fail-closed, 503 ONVO_PRICE_ID_FALTANTE, el plan no cambia, nada se cobra.
 *  C) llave onvo_test_ + ONVO_PRICE_ID_PYME/NEGOCIO_PLUS de prueba (E2E_ONVO_PRECIOS=listo): cobro real de sandbox
 *     con tarjeta 4242 por el SDK web de ONVO; se verifica el monto completo. (No ejecutable sin esos IDs.)
 * Requiere E2E_DATABASE_URL (verifica el correo del negocio nuevo; el plan de pago lo exige).
 */
type Plan = { id: number; nombre: string; precioUsd: number }
const planes = async (api: import('@playwright/test').APIRequestContext) => (await (await api.get('/api/billing/planes')).json()) as Plan[]

async function pagarConTarjeta4242(page: Page, r: { publishableKey: string; subscriptionId: string; customerId: string }) {
  await page.goto('/')
  await page.addScriptTag({ url: 'https://sdk.onvopay.com/sdk.js' })
  await page.evaluate((p) => {
    const el = document.createElement('div'); el.id = 'onvo-e2e'; document.body.appendChild(el)
    const w = window as unknown as { onvo: { pay: (o: unknown) => { render: (s: string) => void; submitPayment: () => void } }; __onvoOk?: boolean; __onvoErr?: string; __onvoPay?: { submitPayment: () => void } }
    const pay = w.onvo.pay({
      publicKey: p.publishableKey, subscriptionId: p.subscriptionId, customerId: p.customerId, paymentType: 'subscription', manualSubmit: true,
      onSuccess: () => { w.__onvoOk = true }, onError: (e: { message?: string }) => { w.__onvoErr = e?.message ?? 'error' },
    })
    pay.render('#onvo-e2e'); w.__onvoPay = pay
  }, r)
  const f = page.frameLocator('#onvo-e2e iframe')
  await f.getByPlaceholder(/n[uú]mero|card number|1234/i).first().fill('4242424242424242')
  await f.getByPlaceholder(/MM|vencimiento|expir/i).first().fill('12/34')
  await f.getByPlaceholder(/cvc|cvv|c[oó]digo/i).first().fill('123')
  await page.evaluate(() => (window as unknown as { __onvoPay: { submitPayment: () => void } }).__onvoPay.submitPayment())
  await expect.poll(() => page.evaluate(() => (window as unknown as { __onvoOk?: boolean }).__onvoOk === true), { timeout: 60_000 }).toBe(true)
}

test.describe.serial('Flujos 2 y 5 — cobro ONVO de prueba y cambio PYME → Negocio Plus (monto completo)', () => {
  test.skip(!conSql, 'Requiere E2E_DATABASE_URL (BD efímera) para verificar el correo del negocio nuevo')
  let n: Negocio
  let pyme: Plan, plus: Plan

  test.beforeAll(async ({ request }) => {
    abortarSiOnvoLive()
    n = await registrarNegocio(request, 'Plan')
    verificarCorreo(n.correo) // el correo se valida antes que la aprobación
    // Negocio sin aprobar: no elige plan (fail-closed, 409) ni cobra nada.
    const pend = await request.post(`/api/billing/cambiar-plan/${(await planes(request))[1].id}`, { headers: auth(n.sesion) })
    expect(pend.status()).toBe(409)
    expect((await pend.json()).codigo).toBe('EMPRESA_PENDIENTE_APROBACION')
    aprobarNegocio(n.empresaId)
    const ps = await planes(request)
    pyme = ps.find((p) => p.nombre === 'PYME')!; plus = ps.find((p) => p.nombre === 'NEGOCIO_PLUS')!
    expect(plus.precioUsd, 'Plus cuesta más que PYME').toBeGreaterThan(pyme.precioUsd)
  })

  test('modo A (mock, sin llave): PYME → Plus activa el plan local sin cobro', async ({ request }) => {
    test.skip(conOnvoPrueba, 'Hay llave onvo_test_: aplica el modo B/C')
    const h = auth(n.sesion)
    expect((await request.post(`/api/billing/cambiar-plan/${pyme.id}`, { headers: h })).status()).toBe(200)
    const up = await request.post(`/api/billing/cambiar-plan/${plus.id}`, { headers: h })
    const body = await up.json()
    expect(up.status(), JSON.stringify(body)).toBe(200)
    expect(body.mock, 'mock explícito: no hay cobro real').toBe(true)
    expect((await (await request.get('/api/tenant/info', { headers: h })).json()).planNombre).toBe('NEGOCIO_PLUS')
  })

  test('modo B (onvo_test_ sin price ids): fail-closed, sin cobro y el plan no cambia', async ({ request }) => {
    test.skip(!conOnvoPrueba || conPreciosOnvo, 'Solo con llave de prueba y sin ONVO_PRICE_ID_*')
    const h = auth(n.sesion)
    const r = await request.post(`/api/billing/cambiar-plan/${plus.id}`, { headers: h })
    expect(r.status()).toBe(503)
    expect((await r.json()).codigo).toBe('ONVO_PRICE_ID_FALTANTE')
    expect(JSON.stringify(await (await request.get('/api/tenant/info', { headers: h })).json())).not.toContain('NEGOCIO_PLUS"')
  })

  test('modo C (sandbox real): paga PYME con 4242, sube a Plus y se cobra el monto COMPLETO sin prorrateo', async ({ page, request }) => {
    test.skip(!conPreciosOnvo, 'Requiere onvo_test_ + ONVO_PRICE_ID_PYME/NEGOCIO_PLUS de prueba (E2E_ONVO_PRECIOS=listo)')
    test.setTimeout(240_000)
    const h = auth(n.sesion)
    // 1) PYME: alta con tarjeta 4242.
    const a = await (await request.post(`/api/billing/cambiar-plan/${pyme.id}`, { headers: h })).json()
    expect(a.status).toBe('requiere_pago')
    await pagarConTarjeta4242(page, a)
    // 2) Plan PYME activo (webhook o reconciliación contra ONVO).
    await expect.poll(async () => {
      await request.post('/api/billing/reconciliar-pago', { headers: h })
      return (await (await request.get('/api/tenant/info', { headers: h })).json()).planNombre
    }, { timeout: 90_000, intervals: [3000] }).toBe('PYME')
    // 3) Subida a Plus: el backend pide cobro por el monto completo del plan nuevo.
    const b = await (await request.post(`/api/billing/cambiar-plan/${plus.id}`, { headers: h })).json()
    expect(b.status).toBe('requiere_pago')
    expect(b.montoUsd, 'monto completo del plan nuevo, sin prorrateo').toBe(plus.precioUsd)
    await pagarConTarjeta4242(page, b)
    await expect.poll(async () => {
      await request.post('/api/billing/reconciliar-pago', { headers: h })
      return (await (await request.get('/api/tenant/info', { headers: h })).json()).planNombre
    }, { timeout: 90_000, intervals: [3000] }).toBe('NEGOCIO_PLUS')
    // 4) La factura SaaS registrada es por el monto completo (no menor).
    const facturas = (await (await request.get('/api/billing/facturas', { headers: h })).json()) as Array<Record<string, unknown>>
    const montos = facturas.map((f) => Number(f.montoUsd ?? f.monto ?? f.total)).filter((x) => !Number.isNaN(x))
    expect(montos, 'alguna factura por el monto completo de Plus').toContain(plus.precioUsd)
  })
})
