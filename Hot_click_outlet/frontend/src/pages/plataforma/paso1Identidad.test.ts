import { describe, expect, it } from 'vitest'
import { camposDelError, erroresPaso1 } from './tiendaRapida'

describe('Paso 1 del enlace: solo el nombre (sin cédula, decisión del dueño)', () => {
  it('nombre vacío o muy corto → error con la clave i18n existente', () => {
    expect(erroresPaso1('')).toEqual({ persona: 'checkout.errores.nombreRequerido' })
    expect(erroresPaso1('  ')).toEqual({ persona: 'checkout.errores.nombreRequerido' })
    expect(erroresPaso1('A').persona).toBeDefined()
  })
  it('nombre válido → sin errores y sin campo cédula', () => {
    expect(erroresPaso1('Ana Mora')).toEqual({})
  })
  it('lee el error de nombre del 400 del backend e ignora una cédula vieja', () => {
    const err = { response: { status: 400, data: { data: { campos: { persona: 'El nombre…', cedula: 'x' } } } } }
    expect(camposDelError(err)).toEqual({ persona: 'El nombre…' })
    expect(camposDelError(new Error('x'))).toEqual({})
  })
})
