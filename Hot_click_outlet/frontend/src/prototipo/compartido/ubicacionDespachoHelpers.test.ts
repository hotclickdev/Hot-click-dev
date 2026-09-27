import { describe, expect, it } from 'vitest'
import {
  MAX_DIRECCION_EXACTA,
  UBICACION_INICIAL,
  conProvincia,
  erroresUbicacion,
  payloadUbicacion,
  payloadUbicacionRegistro,
  ubicacionCompleta,
  type UbicacionDespacho,
} from './ubicacionDespachoHelpers'

const COMPLETA: UbicacionDespacho = {
  provincia: 'Heredia',
  canton: 'Belén',
  direccionExacta: '  Del Automercado 100 m sur  ',
  permiteRetiroCliente: true,
}

describe('erroresUbicacion', () => {
  it('marca provincia, cantón y dirección cuando están vacíos', () => {
    expect(erroresUbicacion(UBICACION_INICIAL)).toEqual({
      provincia: 'Elegí la provincia.',
      canton: 'Elegí el cantón.',
      direccionExacta: 'Escribí la dirección exacta.',
    })
  })

  it('rechaza un cantón que no pertenece a la provincia', () => {
    expect(erroresUbicacion({ ...COMPLETA, canton: 'Escazú' })).toEqual({ canton: 'Elegí el cantón.' })
  })

  it('no marca errores con la ubicación completa', () => {
    expect(erroresUbicacion(COMPLETA)).toEqual({})
    expect(ubicacionCompleta(COMPLETA)).toBe(true)
  })

  it('considera incompleta una dirección con solo espacios', () => {
    expect(ubicacionCompleta({ ...COMPLETA, direccionExacta: '   ' })).toBe(false)
  })
})

describe('conProvincia', () => {
  it('limpia el cantón si no pertenece a la nueva provincia', () => {
    expect(conProvincia(COMPLETA, 'Limón')).toMatchObject({ provincia: 'Limón', canton: '' })
  })

  it('conserva el cantón si sigue siendo válido', () => {
    expect(conProvincia(COMPLETA, 'Heredia').canton).toBe('Belén')
  })
})

describe('payloadUbicacion', () => {
  it('manda strings (el backend recibe Map<String, String>) y recorta la dirección', () => {
    expect(payloadUbicacion(COMPLETA)).toEqual({
      provincia: 'Heredia',
      canton: 'Belén',
      direccionExacta: 'Del Automercado 100 m sur',
      permiteRetiroCliente: 'true',
    })
  })

  it('manda permiteRetiroCliente=false cuando el retiro está apagado', () => {
    expect(payloadUbicacion({ ...COMPLETA, permiteRetiroCliente: false }).permiteRetiroCliente).toBe('false')
  })
})

describe('payloadUbicacionRegistro', () => {
  it('manda boolean real (DTO de alta) y recorta la dirección', () => {
    expect(payloadUbicacionRegistro(COMPLETA)).toEqual({
      provincia: 'Heredia',
      canton: 'Belén',
      direccionExacta: 'Del Automercado 100 m sur',
      permiteRetiroCliente: true,
    })
  })
})

describe('erroresUbicacion — largo de la dirección', () => {
  it(`rechaza direcciones de más de ${MAX_DIRECCION_EXACTA} caracteres`, () => {
    const larga = { ...COMPLETA, direccionExacta: 'd'.repeat(MAX_DIRECCION_EXACTA + 1) }
    expect(erroresUbicacion(larga).direccionExacta).toBe('La dirección no puede superar 255 caracteres.')
  })

  it('acepta justo el máximo (sin contar espacios de los extremos)', () => {
    const justa = { ...COMPLETA, direccionExacta: ` ${'d'.repeat(MAX_DIRECCION_EXACTA)} ` }
    expect(erroresUbicacion(justa)).toEqual({})
  })
})
