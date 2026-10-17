import { describe, expect, it } from 'vitest'
import { normalizarFrecuencia } from './frecuenciaApi'
import { ERROR_FRECUENCIA_OBLIGATORIA, OPCIONES_FRECUENCIA } from './SelectorFrecuencia'
import { avisoCambioManual } from './LiquidacionPage'

describe('S2-28 frecuencia de liquidación', () => {
  it('dos opciones con US$3 por pago y sin montos inventados', () => {
    expect(OPCIONES_FRECUENCIA.map((o) => o.valor)).toEqual(['QUINCENAL', 'MENSUAL'])
    expect(OPCIONES_FRECUENCIA.every((o) => o.detalle.includes('US$3 por pago'))).toBe(true)
    expect(OPCIONES_FRECUENCIA[1].extra).toBe('Ahorrás un cargo de US$3 al mes.')
    expect(OPCIONES_FRECUENCIA.map((o) => o.detalle).join(' ')).not.toMatch(/₡|%/)
  })

  it('sin valor por defecto: hay que elegir; normaliza el contrato supuesto', () => {
    expect(ERROR_FRECUENCIA_OBLIGATORIA).toMatch(/Elegí/)
    expect(normalizarFrecuencia({ data: { actual: 'MENSUAL', pendiente: 'QUINCENAL' } })).toEqual({ actual: 'MENSUAL', pendiente: 'QUINCENAL' })
    expect(normalizarFrecuencia(null)).toEqual({ actual: null, pendiente: null })
    expect(normalizarFrecuencia({})).toEqual({ actual: null, pendiente: null })
  })

  it('avisa que el cambio se aplica a mano en ONVO con la frecuencia actual', () => {
    expect(avisoCambioManual('QUINCENAL')).toContain('sigue la frecuencia actual (Quincenal)')
  })
})
