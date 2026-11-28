import { describe, expect, it } from 'vitest'
import { correoValido, exigeDeclaracion, formatoPct, leerEstadoFiscal, mensajePendiente, normalizarCedula, selloVerifAuto, tipoCedula } from './fiscal'

describe('cédula fiscal', () => {
  it('acepta física (9, sin 0 inicial), jurídica (10, empieza con 3) y DIMEX (11 o 12), con o sin guiones', () => {
    expect(normalizarCedula('1-1111-1111')).toBe('111111111')
    expect(normalizarCedula('3 111 111111')).toBe('3111111111')
    expect(normalizarCedula('11111111111')).toBe('11111111111')
    expect(normalizarCedula('111111111111')).toBe('111111111111')
  })
  it('rechaza tipo inválido, largos fuera de rango, letras y vacío', () => {
    expect(normalizarCedula('011111111')).toBeNull()
    expect(normalizarCedula('1111111111')).toBeNull()
    expect(normalizarCedula('2111111111')).toBeNull()
    expect(normalizarCedula('11111111')).toBeNull()
    expect(normalizarCedula('1111111111111')).toBeNull()
    expect(normalizarCedula('ABC111111')).toBeNull()
    expect(normalizarCedula('')).toBeNull()
  })
  it('clasifica el tipo por largo', () => {
    expect(tipoCedula('111111111')).toBe('FISICA')
    expect(tipoCedula('3111111111')).toBe('JURIDICA')
    expect(tipoCedula('11111111111')).toBe('DIMEX')
    expect(tipoCedula('1234')).toBeNull()
  })
})

describe('declaración jurada', () => {
  it('solo la exige quien dice estar inscrito', () => {
    expect(exigeDeclaracion('INSCRITO')).toBe(true)
    expect(exigeDeclaracion('REGIMEN_SIMPLIFICADO')).toBe(true)
    expect(exigeDeclaracion('NO_INSCRITO')).toBe(false)
    expect(exigeDeclaracion('')).toBe(false)
  })
})

describe('correo y porcentaje', () => {
  it('valida el correo de facturas', () => {
    expect(correoValido('facturas@example.com')).toBe(true)
    expect(correoValido('sin-arroba')).toBe(false)
    expect(correoValido('a@b')).toBe(false)
    expect(correoValido('a@b.')).toBe(false)
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
    expect(selloVerifAuto('COINCIDE', [])).toEqual({ texto: 'Coincide con Hacienda (no prueba titularidad)', tono: 'ok' })
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
