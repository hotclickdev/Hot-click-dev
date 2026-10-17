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

describe('clavePlanPendiente', () => {
  it('Negocio Plus y Pyme tienen su texto; los 3 idiomas lo traen', async () => {
    const { clavePlanPendiente } = await import('./planPendiente')
    expect(clavePlanPendiente('NEGOCIO_PLUS')).toBe('planPendiente.negocioPlus')
    expect(clavePlanPendiente('Negocio Plus')).toBe('planPendiente.negocioPlus')
    expect(clavePlanPendiente('PYME')).toBe('planPendiente.pyme')
    for (const l of ['es', 'en', 'pt']) {
      const json = (await import(`../../i18n/locales/${l}.json`)).default as Record<string, Record<string, string>>
      expect(json.planPendiente.pyme).toMatch(/Pyme/)
      expect(json.planPendiente.negocioPlus).toMatch(/Negocio Plus/)
    }
    const es = (await import('../../i18n/locales/es.json')).default as unknown as Record<string, Record<string, string>>
    expect(es.planPendiente.pyme).toBe('Tu plan Pyme se activa apenas se confirme el pago. Mientras tanto tu tienda funciona con las funciones de Emprendedor.')
  })
})
