import { describe, expect, it } from 'vitest'
import { MSG_PLAN_YA_ACTIVO, mensajeErrorPlan } from './useCambiarPlan'

/** QA3-022: checkout al plan actual → 409 PLAN_YA_ACTIVO con mensaje claro, no el genérico. */
describe('checkout al plan ya activo', () => {
  it('409 PLAN_YA_ACTIVO muestra el aviso de plan activo', () => {
    const err = { response: { status: 409, data: { codigo: 'PLAN_YA_ACTIVO', error: 'x' } } }
    expect(mensajeErrorPlan(err, 'fallback')).toBe(MSG_PLAN_YA_ACTIVO)
    expect(MSG_PLAN_YA_ACTIVO).toContain('Ya tenés este plan activo')
  })
})
