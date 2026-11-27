import { describe, expect, it } from 'vitest'
import { correoValido, formatoPct, leerEstadoFiscal, normalizarCedula, tipoCedula } from './fiscal'

describe('cédula fiscal', () => {
  it('acepta 9, 10, 11 y 12 dígitos con o sin guiones', () => {
    expect(normalizarCedula('1-0123-0456')).toBe('101230456')
    expect(normalizarCedula('3 101 123456')).toBe('3101123456')
    expect(normalizarCedula('15500012345')).toBe('15500012345')
    expect(normalizarCedula('155000123456')).toBe('155000123456')
  })
  it('rechaza largos fuera de rango, letras y vacío', () => {
    expect(normalizarCedula('12345678')).toBeNull()
    expect(normalizarCedula('1234567890123')).toBeNull()
    expect(normalizarCedula('ABC123456')).toBeNull()
    expect(normalizarCedula('')).toBeNull()
  })
  it('clasifica el tipo por largo', () => {
    expect(tipoCedula('101230456')).toBe('FISICA')
    expect(tipoCedula('3101123456')).toBe('JURIDICA')
    expect(tipoCedula('15500012345')).toBe('DIMEX')
    expect(tipoCedula('1234')).toBeNull()
  })
})

describe('correo y porcentaje', () => {
  it('valida el correo de facturas', () => {
    expect(correoValido('facturas@negocio.cr')).toBe(true)
    expect(correoValido('sin-arroba')).toBe(false)
  })
  it('formatea el porcentaje con coma decimal', () => {
    expect(formatoPct(23)).toBe('23 %')
    expect(formatoPct(7.5)).toBe('7,5 %')
  })
})

describe('leerEstadoFiscal', () => {
  it('lee la respuesta con y sin sobre', () => {
    const d = { situacionFiscal: 'NO_INSCRITO', comisionPlanPct: 9, comisionExtraPct: 14, comisionEfectivaPct: 23, diasEnviarFactura: 7 }
    expect(leerEstadoFiscal(d).comisionEfectivaPct).toBe(23)
    expect(leerEstadoFiscal({ data: d }).situacionFiscal).toBe('NO_INSCRITO')
  })
  it('valores raros no rompen: sin situación y 7 días', () => {
    const e = leerEstadoFiscal({ situacionFiscal: 'otra' })
    expect(e.situacionFiscal).toBeNull()
    expect(e.diasEnviarFactura).toBe(7)
  })
})
