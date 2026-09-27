import { describe, expect, it } from 'vitest'
import {
  FORM_BODEGA_INICIAL,
  MENSAJE_NOMBRE_OBLIGATORIO,
  MENSAJE_TELEFONO_INVALIDO,
  MENSAJE_TELEFONO_OBLIGATORIO,
  errorTelefono,
  payloadCrearBodega,
  validarPasoBodega,
  type FormBodega,
} from './nuevaBodegaHelpers'
import { MENSAJE_UBICACION_INCOMPLETA } from './ubicacionDespachoHelpers'

const FORM_COMPLETO: FormBodega = {
  nombre: ' Bodega Central ',
  telefono: ' 8888-8888 ',
  encargado: '',
  ubicacion: {
    provincia: 'San José',
    canton: 'Escazú',
    direccionExacta: 'Frente al parque',
    permiteRetiroCliente: false,
  },
}

describe('errorTelefono', () => {
  it('exige teléfono', () => {
    expect(errorTelefono('  ')).toBe(MENSAJE_TELEFONO_OBLIGATORIO)
  })

  it('rechaza letras o largo fuera de 7 a 20', () => {
    expect(errorTelefono('abc1234')).toBe(MENSAJE_TELEFONO_INVALIDO)
    expect(errorTelefono('123')).toBe(MENSAJE_TELEFONO_INVALIDO)
  })

  it('acepta formatos de Costa Rica', () => {
    expect(errorTelefono('8888 8888')).toBeNull()
    expect(errorTelefono('+506 8888-8888')).toBeNull()
  })
})

describe('validarPasoBodega', () => {
  it('en el paso nombre pide primero el nombre y después el teléfono', () => {
    expect(validarPasoBodega('nombre', FORM_BODEGA_INICIAL)).toBe(MENSAJE_NOMBRE_OBLIGATORIO)
    expect(validarPasoBodega('nombre', { ...FORM_BODEGA_INICIAL, nombre: 'B1' })).toBe(MENSAJE_TELEFONO_OBLIGATORIO)
  })

  it('bloquea el paso ubicación si falta provincia, cantón o dirección', () => {
    expect(validarPasoBodega('ubicacion', FORM_BODEGA_INICIAL)).toBe(MENSAJE_UBICACION_INCOMPLETA)
    const sinDireccion = { ...FORM_COMPLETO, ubicacion: { ...FORM_COMPLETO.ubicacion, direccionExacta: '' } }
    expect(validarPasoBodega('ubicacion', sinDireccion)).toBe(MENSAJE_UBICACION_INCOMPLETA)
  })

  it('deja avanzar con los datos completos y el encargado es opcional', () => {
    expect(validarPasoBodega('nombre', FORM_COMPLETO)).toBeNull()
    expect(validarPasoBodega('ubicacion', FORM_COMPLETO)).toBeNull()
    expect(validarPasoBodega('encargado', FORM_COMPLETO)).toBeNull()
  })
})

describe('payloadCrearBodega', () => {
  it('arma el cuerpo de POST /api/bodegas con la ubicación de despacho', () => {
    expect(payloadCrearBodega(FORM_COMPLETO)).toEqual({
      nombreBodega: 'Bodega Central',
      telefono: '8888-8888',
      provincia: 'San José',
      canton: 'Escazú',
      direccionExacta: 'Frente al parque',
      permiteRetiroCliente: 'false',
    })
  })

  it('incluye el encargado solo si viene', () => {
    expect(payloadCrearBodega({ ...FORM_COMPLETO, encargado: ' Sofía ' }).encargadoNombre).toBe('Sofía')
  })
})
