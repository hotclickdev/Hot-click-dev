import { describe, expect, it } from 'vitest'
import {
  COMISION_GATEWAY_PCT_DEFAULT,
  descuentoSinpe,
  parseConfigComision,
  precioSugerido,
  redondearA50,
} from './comisionPrecio'

describe('redondearA50', () => {
  it('redondea al múltiplo de 50 más cercano', () => {
    expect(redondearA50(10424)).toBe(10400)
    expect(redondearA50(10425)).toBe(10450)
    expect(redondearA50(50)).toBe(50)
  })

  it('devuelve 0 para montos inválidos', () => {
    expect(redondearA50(0)).toBe(0)
    expect(redondearA50(-10)).toBe(0)
  })
})

describe('precioSugerido', () => {
  it('cubre el neto tras comisión porcentual', () => {
    expect(precioSugerido(10000, 4, 0)).toBe(10400)
  })

  it('suma el fijo antes de aplicar el %', () => {
    expect(precioSugerido(10000, 4, 400)).toBe(10850)
  })

  it('sin comisión solo redondea neto + fijo', () => {
    expect(precioSugerido(10000, 0, 0)).toBe(10000)
    expect(precioSugerido(10010, 0, 0)).toBe(10000)
  })
})

describe('descuentoSinpe', () => {
  it('calcula el ahorro estimado por % de pasarela', () => {
    expect(descuentoSinpe(10000, 4)).toBe(400)
    expect(descuentoSinpe(12500, 4)).toBe(500)
  })

  it('es 0 si total o pct no aplican', () => {
    expect(descuentoSinpe(0, 4)).toBe(0)
    expect(descuentoSinpe(10000, 0)).toBe(0)
  })
})

describe('parseConfigComision', () => {
  it('usa defaults si raw es inválido', () => {
    expect(parseConfigComision(null).pctComisionTarjeta).toBe(COMISION_GATEWAY_PCT_DEFAULT)
  })

  it('normaliza la respuesta del API', () => {
    expect(parseConfigComision({
      pctComisionTarjeta: 5.5,
      montoFijoComisionCrc: 250,
      pctDescuentoSinpe: 2,
    })).toEqual({
      pctComisionTarjeta: 5.5,
      montoFijoComisionCrc: 250,
      pctDescuentoSinpe: 2,
    })
  })
})
