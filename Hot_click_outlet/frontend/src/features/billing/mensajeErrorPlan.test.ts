import { describe, expect, it } from 'vitest'
import { mensajeErrorPlan, MENSAJE_COBRO_PLAN_NO_DISPONIBLE } from './useCambiarPlan'

const err409 = (data: unknown) => ({ response: { status: 409, data } })

describe('mensajeErrorPlan', () => {
  it.each(['COBRO_PLAN_NO_DISPONIBLE', 'PLAN_SIN_PRECIO', 'PLAN_NO_DISPONIBLE'])('409 %s muestra mensaje claro, no el código crudo', (codigo) => {
    expect(mensajeErrorPlan(err409({ codigo, error: 'x' }), 'f')).toBe(MENSAJE_COBRO_PLAN_NO_DISPONIBLE)
    expect(mensajeErrorPlan(err409({ error: codigo }), 'f')).toBe(MENSAJE_COBRO_PLAN_NO_DISPONIBLE)
  })
  it('otros errores conservan el texto del backend o el respaldo', () => {
    expect(mensajeErrorPlan({ response: { status: 400, data: { error: 'Verificá tu correo' } } }, 'f')).toBe('Verificá tu correo')
    expect(mensajeErrorPlan(new Error('red'), 'f')).toBe('f')
  })
})
