import { describe, expect, it } from 'vitest'
import {
  monedaDePlanes,
  textoComision,
  textoMensualidad,
  textoMensualidadEmprendedor,
  textoMonedaPlanes,
  textoPlan,
} from './planesPrecios'

describe('planesPrecios', () => {
  it('sin monto del backend no inventa precio ni promete gratis', () => {
    expect(textoPlan('PYME')).toBe('Mensualidad del plan + 7,5% por venta')
    expect(textoPlan('EMPRENDEDOR')).toBe('Mensualidad del plan + 9% por venta')
    expect(textoMensualidad(0)).toBe('Mensualidad del plan')
    expect(textoPlan('PYME', null, true)).toBe('Mensualidad del plan + 7,5% por venta')
    expect(textoMensualidad(null, false, 'USD')).toBe('Mensualidad en dólares')
    expect(textoMensualidad(null, false, 'CRC')).toBe('Mensualidad en colones')
  })
  it('USD: usa el monto y la moneda que manda el backend', () => {
    expect(textoPlan('EMPRENDEDOR', 9, false, 'USD')).toBe('US$9/mes + 9% por venta')
    expect(textoPlan('NEGOCIO_PLUS', 49, false, 'usd')).toBe('US$49/mes + 6% por venta')
  })
  it('CRC: muestra colones con miles', () => {
    expect(textoMensualidad(12900, false, 'CRC')).toBe('₡12.900/mes')
    expect(textoPlan('PYME', 12900, false, 'crc')).toBe('₡12.900/mes + 7,5% por venta')
    expect(textoMensualidad(12900, false, 'CRC')).not.toContain('US$')
  })
  it('moneda desconocida o ausente: texto neutro, nunca un monto inventado', () => {
    expect(textoMensualidad(24)).toBe('Mensualidad del plan')
    expect(textoMensualidad(24, false, 'EUR')).toBe('Mensualidad del plan')
    expect(textoMensualidad(24, false, null)).toBe('Mensualidad del plan')
  })
  it('«Sin mensualidad» solo con cupo gratis', () => {
    expect(textoPlan('EMPRENDEDOR', 9, true, 'USD')).toBe('Sin mensualidad + 9% por venta')
    expect(textoComision(7.5, 0)).toBe('7,5% por venta')
  })
  it('Emprendedor: gratis solo con cupo; sin cupo, monto y moneda desde backend', () => {
    expect(textoMensualidadEmprendedor({ cuposGratisDisponibles: 3, mensualidadUsdSinCupo: 9, moneda: 'USD' })).toBe('Sin mensualidad')
    expect(textoMensualidadEmprendedor({ cuposGratisDisponibles: 0, mensualidadUsdSinCupo: 9, moneda: 'USD' })).toBe('US$9/mes')
    expect(textoMensualidadEmprendedor({ cuposGratisDisponibles: 0, mensualidadUsdSinCupo: 5900, moneda: 'CRC' })).toBe('₡5.900/mes')
    expect(textoMensualidadEmprendedor({ cuposGratisDisponibles: 0, mensualidadUsdSinCupo: null, moneda: 'CRC' })).toBe('Mensualidad en colones')
    expect(textoMensualidadEmprendedor(null)).toBe('Mensualidad del plan')
  })
  it('frase de moneda según el backend', () => {
    expect(textoMonedaPlanes('CRC')).toContain('mensualidad del plan se cobra en colones (CRC)')
    expect(textoMonedaPlanes('USD')).toContain('mensualidad del plan se cobra en dólares (USD)')
    expect(textoMonedaPlanes(null)).not.toMatch(/dólares|colones \(CRC\)/)
    expect(textoMonedaPlanes('CRC')).toContain('productos se venden en colones')
  })
  it('monedaDePlanes toma el código del primer plan que lo trae', () => {
    expect(monedaDePlanes([{ nombre: 'PYME' }, { nombre: 'X', moneda: ' crc ' }])).toBe('CRC')
    expect(monedaDePlanes(null)).toBeNull()
    expect(monedaDePlanes([{ moneda: '' }])).toBeNull()
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
    expect(textoPlan('PYME', m.PYME, false, 'USD')).toContain('/mes')
    expect(textoPlan('NEGOCIO_PLUS', m.NEGOCIO_PLUS, false, 'USD')).toContain('Mensualidad en dólares')
    expect(mensualidadesUsd(null)).toEqual({})
  })
})
