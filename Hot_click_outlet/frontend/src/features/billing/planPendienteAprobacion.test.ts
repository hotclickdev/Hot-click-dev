import { describe, expect, it } from 'vitest'
import { MSG_EMPRESA_PENDIENTE_APROBACION, mensajeErrorPlan } from './useCambiarPlan'

/** QA8: negocio pendiente de aprobación → mensaje claro, nunca «Error con la pasarela de pago». */
describe('cambiar plan con negocio pendiente de aprobación', () => {
  it('409 EMPRESA_PENDIENTE_APROBACION muestra el aviso de revisión', () => {
    const err = { response: { status: 409, data: { codigo: 'EMPRESA_PENDIENTE_APROBACION', error: 'x' } } }
    expect(mensajeErrorPlan(err, 'fallback')).toBe(MSG_EMPRESA_PENDIENTE_APROBACION)
    expect(MSG_EMPRESA_PENDIENTE_APROBACION).toBe('Tu negocio está en revisión; podrás elegir plan cuando lo aprobemos.')
  })

  it('otros errores conservan el mensaje del servidor', () => {
    const err = { response: { data: { error: 'Ya tenés el plan PYME' } } }
    expect(mensajeErrorPlan(err, 'fallback')).toBe('Ya tenés el plan PYME')
  })
})
