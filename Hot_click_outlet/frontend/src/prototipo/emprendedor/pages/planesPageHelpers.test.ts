import { describe, expect, it } from 'vitest'
import { validarPasoElegirPlan, mapApiPlanToUi } from '@/prototipo/compartido/planesPageHelpers'

describe('planesPageHelpers', () => {
  const pyme = mapApiPlanToUi({ id: 2, nombre: 'PYME', precioMensual: 9900 })

  it('validarPasoElegirPlan exige selección', () => {
    expect(validarPasoElegirPlan(null, 'EMPRENDEDOR')).toBe('Elegí un plan para continuar.')
  })

  it('validarPasoElegirPlan rechaza plan actual', () => {
    expect(validarPasoElegirPlan(pyme, 'PYME')).toBe('Ese ya es tu plan actual.')
  })

  it('validarPasoElegirPlan acepta plan distinto', () => {
    expect(validarPasoElegirPlan(pyme, 'EMPRENDEDOR')).toBeNull()
  })
})
