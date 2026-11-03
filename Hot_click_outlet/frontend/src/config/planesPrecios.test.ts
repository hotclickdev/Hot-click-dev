import { describe, expect, it } from 'vitest'
import { textoComision, textoMensualidad, textoMensualidadEmprendedor, textoPlan } from './planesPrecios'

describe('planesPrecios', () => {
  it('sin monto del backend no inventa precio ni promete gratis', () => {
    expect(textoPlan('PYME')).toBe('Mensualidad en dólares + 7,5% por venta')
    expect(textoPlan('EMPRENDEDOR')).toBe('Mensualidad en dólares + 9% por venta')
    expect(textoMensualidad(0)).toBe('Mensualidad en dólares')
    expect(textoPlan('PYME', null, true)).toBe('Mensualidad en dólares + 7,5% por venta')
  })
  it('usa el monto USD que manda el backend', () => {
    expect(textoPlan('EMPRENDEDOR', 9)).toBe('US$9/mes + 9% por venta')
    expect(textoPlan('NEGOCIO_PLUS', 49)).toBe('US$49/mes + 6% por venta')
  })
  it('«Sin mensualidad» solo con cupo gratis', () => {
    expect(textoPlan('EMPRENDEDOR', 9, true)).toBe('Sin mensualidad + 9% por venta')
    expect(textoComision(7.5, 0)).toBe('7,5% por venta')
  })
  it('nunca muestra colones en la mensualidad', () => {
    expect(textoMensualidad(12900)).not.toContain('₡')
  })
  it('Emprendedor: gratis solo con cupo; sin cupo, US$ desde backend', () => {
    expect(textoMensualidadEmprendedor({ cuposGratisDisponibles: 3, mensualidadUsdSinCupo: 9 })).toBe('Sin mensualidad')
    expect(textoMensualidadEmprendedor({ cuposGratisDisponibles: 0, mensualidadUsdSinCupo: 9 })).toBe('US$9/mes')
    expect(textoMensualidadEmprendedor({ cuposGratisDisponibles: 0, mensualidadUsdSinCupo: null })).toBe('Mensualidad en dólares')
    expect(textoMensualidadEmprendedor(null)).toBe('Mensualidad en dólares')
  })
})

describe('BAJO área 9: mensualidadesUsd para /vender', () => {
  it('toma precioUsd del backend y descarta montos vacíos o desconocidos', async () => {
    const { mensualidadesUsd, textoPlan } = await import('./planesPrecios')
    const m = mensualidadesUsd([
      { nombre: 'EMPRENDEDOR', precioUsd: 9 },
      { nombre: 'PYME', precioUsd: 24 },
      { nombre: 'NEGOCIO_PLUS', precioUsd: null },
      { nombre: 'OTRO', precioUsd: 5 },
    ])
    expect(m).toEqual({ EMPRENDEDOR: 9, PYME: 24 })
    expect(textoPlan('PYME', m.PYME)).toContain('/mes')
    expect(textoPlan('NEGOCIO_PLUS', m.NEGOCIO_PLUS)).toContain('Mensualidad en dólares')
    expect(mensualidadesUsd(null)).toEqual({})
  })
})
