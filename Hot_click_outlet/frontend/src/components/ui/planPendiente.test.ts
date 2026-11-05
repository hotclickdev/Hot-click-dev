import { describe, expect, it } from 'vitest'
import { accionCompletarPago, nombrePlanVisible, planPorCompletar } from './planPendiente'

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
