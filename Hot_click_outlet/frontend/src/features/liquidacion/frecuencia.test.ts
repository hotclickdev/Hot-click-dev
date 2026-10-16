import { describe, expect, it } from 'vitest'
import { FRECUENCIA_POR_DEFECTO, normalizarFrecuencia } from './frecuenciaApi'
import { OPCIONES_FRECUENCIA } from './SelectorFrecuencia'
import { avisoCambioManual } from './LiquidacionPage'

describe('S2-28 frecuencia de liquidación', () => {
  it('dos opciones con los textos decididos (solo US$3)', () => {
    expect(OPCIONES_FRECUENCIA.map((o) => o.valor)).toEqual(['QUINCENAL', 'MENSUAL'])
    expect(OPCIONES_FRECUENCIA[1].extra).toBe('Ahorrás un cargo de US$3 al mes.')
    expect(OPCIONES_FRECUENCIA.map((o) => o.detalle).join(' ')).not.toMatch(/₡|%/)
  })

  it('por defecto Quincenal y normaliza el contrato supuesto', () => {
    expect(FRECUENCIA_POR_DEFECTO).toBe('QUINCENAL')
    expect(normalizarFrecuencia({ data: { actual: 'MENSUAL', pendiente: 'QUINCENAL' } })).toEqual({ actual: 'MENSUAL', pendiente: 'QUINCENAL' })
    expect(normalizarFrecuencia(null)).toEqual({ actual: 'QUINCENAL', pendiente: null })
  })

  it('avisa que el cambio se aplica a mano en ONVO con la frecuencia actual', () => {
    expect(avisoCambioManual('QUINCENAL')).toContain('sigue la frecuencia actual (Quincenal)')
  })
})
