import { describe, expect, it } from 'vitest'
import { AVISO_CEDULA_FORMATO, camposDelError, erroresPaso1 } from './tiendaRapida'

describe('Paso 1 del enlace: nombre y cédula obligatorios', () => {
  it('vacíos → los dos campos con error (claves i18n existentes)', () => {
    expect(erroresPaso1('', '')).toEqual({
      persona: 'checkout.errores.nombreRequerido',
      cedula: 'checkout.errores.cedulaRequerida',
    })
    expect(erroresPaso1('  ', ' - ')).toEqual({
      persona: 'checkout.errores.nombreRequerido',
      cedula: 'checkout.errores.cedulaRequerida',
    })
  })
  it('cédula física, jurídica o DIMEX: 9 a 12 dígitos, como CedulaCr', () => {
    expect(erroresPaso1('Ana Mora', '1-1234-0567')).toEqual({})
    expect(erroresPaso1('Ana Mora', '3-101-123456')).toEqual({})
    expect(erroresPaso1('Ana Mora', '155812345678')).toEqual({})
    expect(erroresPaso1('Ana Mora', '12345678').cedula).toBe(AVISO_CEDULA_FORMATO)
    expect(erroresPaso1('Ana Mora', '1234567890123').cedula).toBe(AVISO_CEDULA_FORMATO)
    expect(erroresPaso1('A', '112340567').persona).toBeDefined()
  })
  it('lee los errores por campo del 400 del backend', () => {
    const err = { response: { status: 400, data: { data: { campos: { cedula: 'La cédula va con 9 a 12 dígitos.' } } } } }
    expect(camposDelError(err)).toEqual({ cedula: 'La cédula va con 9 a 12 dígitos.' })
    expect(camposDelError(new Error('x'))).toEqual({})
  })
})
