import { describe, expect, it } from 'vitest'
import { nombrePlanVisible, planPorCompletar } from './planPendiente'

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
