import { describe, expect, it } from 'vitest'
import { textoComision, textoMensualidad, textoPlan } from './planesPrecios'

describe('planesPrecios', () => {
  it('arma los textos con los montos confirmados', () => {
    expect(textoPlan('PYME')).toBe('₡12.900/mes + 7% por venta (mínimo ₡700)')
    expect(textoPlan('NEGOCIO_PLUS')).toBe('₡28.900/mes + 7% por venta (mínimo ₡700)')
    expect(textoPlan('EMPRENDEDOR')).toBe('Sin mensualidad + 9% por venta (mínimo ₡700)')
  })
  it('formatea mensualidad y comisión', () => {
    expect(textoMensualidad(0)).toBe('Sin mensualidad')
    expect(textoComision(7.5, 0)).toBe('7,5% por venta')
  })
})
