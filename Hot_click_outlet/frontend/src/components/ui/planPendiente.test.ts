import { describe, expect, it, vi } from 'vitest'
import {
  accionCompletarPago, alVolverDelPago, avisoPlanPendiente, fechaVisible, MSG_PAGO_EN_PROCESO, nombrePlanVisible,
  planPorCompletar,
} from './planPendiente'

describe('aviso «Completar pago» del plan nuevo', () => {
  it('muestra el plan pendiente que manda el backend', () => {
    expect(planPorCompletar({ plan: 'PYME', motivo: 'ALTA' })).toBe('PYME')
    expect(nombrePlanVisible('NEGOCIO_PLUS')).toBe('Negocio Plus')
  })

  it('204 o sin plan: no hay aviso', () => {
    expect(planPorCompletar('')).toBeNull()
    expect(planPorCompletar({})).toBeNull()
  })
})

describe('ALTO-02b «Completar pago» abre el cobro de ONVO, no el cambio de plan', () => {
  it('requiere_pago con subscriptionId: abre el SDK sobre esa suscripción', () => {
    expect(accionCompletarPago({
      status: 'requiere_pago', subscriptionId: 'sub_1', customerId: 'cus_1', publishableKey: 'pk', planNombre: 'PYME',
    })).toEqual({
      tipo: 'pagar',
      pago: { proveedor: 'ONVO', subscriptionId: 'sub_1', customerId: 'cus_1', publishableKey: 'pk', planNombre: 'PYME' },
    })
  })

  it('sin pago pendiente o datos incompletos: va a la pantalla de planes', () => {
    expect(accionCompletarPago({ status: 'sin_pago_pendiente' })).toEqual({ tipo: 'ir_a_planes' })
    expect(accionCompletarPago({ status: 'requiere_pago' })).toEqual({ tipo: 'ir_a_planes' })
    expect(accionCompletarPago({ status: 'requiere_pago', subscriptionId: '  ' })).toEqual({ tipo: 'ir_a_planes' })
    expect(accionCompletarPago(null)).toEqual({ tipo: 'ir_a_planes' })
  })
})

describe('MEDIO-3 al volver del SDK de ONVO se reconcilia', () => {
  it('confirma: refresca el aviso (desaparece sin recargar)', async () => {
    const refrescar = vi.fn().mockResolvedValue(undefined)
    const reconciliar = vi.fn().mockResolvedValue({ data: { status: 'activado' } })
    expect(await alVolverDelPago(reconciliar, refrescar)).toBe('confirmado')
    expect(reconciliar).toHaveBeenCalledTimes(1)
    expect(refrescar).toHaveBeenCalledTimes(1)
  })

  it('no confirma (pendiente, 503 o red): «pago en proceso» sin error y sin refrescar', async () => {
    const refrescar = vi.fn().mockResolvedValue(undefined)
    expect(await alVolverDelPago(() => Promise.resolve({ data: { status: 'pendiente' } }), refrescar)).toBe('en_proceso')
    expect(await alVolverDelPago(() => Promise.reject(new Error('503')), refrescar)).toBe('en_proceso')
    expect(refrescar).not.toHaveBeenCalled()
    expect(MSG_PAGO_EN_PROCESO).toMatch(/tenés/)
  })
})

describe('trial con método de pago guardado: no falta el pago', () => {
  it('muestra el plan y la fecha del primer cobro (fin del trial)', () => {
    const aviso = avisoPlanPendiente({ plan: 'PYME', estado: 'TRIAL_CON_METODO', primerCobro: '2027-02-01' })
    expect(aviso).toEqual({ tipo: 'trial_con_metodo', plan: 'PYME', primerCobro: '2027-02-01' })
    expect(fechaVisible('2027-02-01')).toBe('1 de febrero de 2027')
  })

  it('sin estado o con fecha inválida: sigue «falta el pago»', () => {
    expect(avisoPlanPendiente({ plan: 'PYME' })).toEqual({ tipo: 'falta_pago', plan: 'PYME' })
    expect(avisoPlanPendiente({ plan: 'PYME', estado: 'TRIAL_CON_METODO', primerCobro: 'mañana' }))
      .toEqual({ tipo: 'falta_pago', plan: 'PYME' })
    expect(avisoPlanPendiente(null)).toBeNull()
  })
})

describe('BAJO seguridad: 429 del rate limit de reconciliar-pago', () => {
  it('429: «pago en proceso», sin error y sin refrescar', async () => {
    const refrescar = vi.fn().mockResolvedValue(undefined)
    const err429 = Object.assign(new Error('Request failed with status code 429'), {
      isAxiosError: true, response: { status: 429, data: { status: 'pendiente', error: 'Esperá un minuto' } },
    })
    await expect(alVolverDelPago(() => Promise.reject(err429), refrescar)).resolves.toBe('en_proceso')
    expect(refrescar).not.toHaveBeenCalled()
  })
})

describe('QA #536: trial SIN método de pago → «Completar pago» abre el SDK para guardar el método', () => {
  it('requiere_pago de un trial (factura $0 ya paid) abre el SDK sobre la misma suscripción, no navega a planes', () => {
    const accion = accionCompletarPago({
      status: 'requiere_pago', subscriptionId: 'sub_trial', customerId: 'cus_1', publishableKey: 'pk_test',
      planNombre: 'PYME', trialDias: 90,
    })
    expect(accion.tipo).toBe('pagar')
    expect(accion).toEqual({
      tipo: 'pagar',
      pago: { proveedor: 'ONVO', subscriptionId: 'sub_trial', customerId: 'cus_1', publishableKey: 'pk_test', planNombre: 'PYME', trialDias: 90 },
    })
  })
})

describe('checkout con período gratis (trialDias)', () => {
  it('con trialDias y fecha: tarjeta registrada ahora y «Tu primer cobro es el …»', async () => {
    const { textoCheckoutTrial } = await import('./planPendiente')
    const t = textoCheckoutTrial(30, '2027-02-01')
    expect(t).toMatch(/Registramos tu tarjeta ahora/)
    expect(t).toContain('Tu primer cobro es el 1 de febrero de 2027')
  })
  it('con trialDias sin fecha: explica que el primer cobro es al terminar el período gratis', async () => {
    const { textoCheckoutTrial } = await import('./planPendiente')
    expect(textoCheckoutTrial(14)).toMatch(/primer cobro se hace al terminar el período gratis/)
  })
  it('0, ausente o inválido: sin texto (checkout normal)', async () => {
    const { textoCheckoutTrial } = await import('./planPendiente')
    for (const x of [0, -1, undefined, null, 1.5]) expect(textoCheckoutTrial(x, '2027-02-01')).toBeNull()
  })
  it('completar-pago: trialDias de la respuesta llega al cobro', () => {
    const r = accionCompletarPago({ status: 'requiere_pago', subscriptionId: 's1', trialDias: 30, primerCobro: '2027-02-01' })
    expect(r).toMatchObject({ tipo: 'pagar', pago: { trialDias: 30, primerCobro: '2027-02-01' } })
    const sin = accionCompletarPago({ status: 'requiere_pago', subscriptionId: 's1', trialDias: 0 })
    expect(sin.tipo === 'pagar' && sin.pago.trialDias).toBeUndefined()
  })
})
