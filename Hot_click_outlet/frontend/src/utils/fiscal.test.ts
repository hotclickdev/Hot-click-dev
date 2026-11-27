import { describe, expect, it } from 'vitest'
import { correoValido, formatoPct, leerEstadoFiscal, mensajePendiente, normalizarCedula, selloVerifAuto, tipoCedula } from './fiscal'

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

describe('mensajes de verificación', () => {
  it('el vendedor ve un mensaje distinto según la comprobación con Hacienda', () => {
    expect(mensajePendiente('COINCIDE')).toContain('coinciden con Hacienda; HotClick los confirma pronto')
    expect(mensajePendiente('NO_COINCIDE')).toContain('no coinciden con Hacienda: revisá cédula o nombre')
    expect(mensajePendiente('NO_ENCONTRADO')).toContain('revisá cédula o nombre')
    expect(mensajePendiente('ERROR_CONSULTA')).toContain('Pendiente de verificación')
    expect(mensajePendiente(null)).toContain('el extra se quita cuando HotClick lo confirme')
  })
  it('el sello del ADMIN nombra los campos que no coinciden', () => {
    expect(selloVerifAuto('COINCIDE', [])).toEqual({ texto: 'Coincide con Hacienda', tono: 'ok' })
    expect(selloVerifAuto('NO_COINCIDE', ['nombre', 'regimen']).texto).toBe('No coincide: nombre, régimen')
    expect(selloVerifAuto('ERROR_CONSULTA', undefined).tono).toBe('neutro')
    expect(selloVerifAuto(null, undefined).texto).toContain('No se pudo consultar')
  })
})

describe('leerEstadoFiscal', () => {
  it('lee verificación y pendiente', () => {
    const e = leerEstadoFiscal({ situacionFiscal: 'INSCRITO', fiscalVerificado: false, pendienteVerificacion: true, tieneDatosFiscales: true, verifAuto: 'COINCIDE' })
    expect(e).toMatchObject({ verificado: false, pendiente: true, tieneDatos: true, verifAuto: 'COINCIDE' })
    expect(leerEstadoFiscal({ verifAuto: 'raro' }).verifAuto).toBeNull()
  })
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
