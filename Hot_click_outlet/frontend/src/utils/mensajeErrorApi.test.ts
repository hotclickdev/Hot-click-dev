import { describe, expect, it } from 'vitest'
import { mensajeErrorApi } from './mensajeErrorApi'

describe('mensajeErrorApi', () => {
  it('usa response.data.message de ResponseDTO', () => {
    const err = {
      response: {
        data: { success: false, message: 'Paquete cerrado', data: null },
      },
    }
    expect(mensajeErrorApi(err, 'fallback')).toBe('Paquete cerrado')
  })

  it('usa response.data.error cuando no hay message (Spring default)', () => {
    const err = {
      response: {
        data: {
          timestamp: '2026-01-01T00:00:00',
          status: 404,
          error: 'Not Found',
          path: '/api/foo',
        },
      },
    }
    expect(mensajeErrorApi(err, 'fallback')).toBe('Not Found')
  })

  it('prefiere message sobre error cuando Spring envía ambos', () => {
    const err = {
      response: {
        data: {
          status: 400,
          error: 'Bad Request',
          message: 'nombre: no debe estar vacío',
        },
      },
    }
    expect(mensajeErrorApi(err, 'fallback')).toBe('nombre: no debe estar vacío')
  })

  it('usa data.message anidado cuando el top-level no trae texto', () => {
    const err = {
      response: {
        data: {
          success: false,
          message: '',
          data: { message: 'Línea 3: SKU duplicado' },
        },
      },
    }
    expect(mensajeErrorApi(err, 'fallback')).toBe('Línea 3: SKU duplicado')
  })

  it('prefiere message top-level sobre data.message anidado', () => {
    const err = {
      response: {
        data: {
          success: false,
          message: 'Importación con errores',
          data: { message: 'detalle interno' },
        },
      },
    }
    expect(mensajeErrorApi(err, 'fallback')).toBe('Importación con errores')
  })

  it('usa Error.message si no hay respuesta axios', () => {
    expect(mensajeErrorApi(new Error('timeout'), 'fallback')).toBe('timeout')
  })

  it('devuelve fallback para valores desconocidos', () => {
    expect(mensajeErrorApi(null, 'Error genérico')).toBe('Error genérico')
    expect(mensajeErrorApi({ response: { data: {} } }, 'Error genérico')).toBe('Error genérico')
  })

  it('devuelve undefined sin fallback cuando no hay mensaje', () => {
    expect(mensajeErrorApi(null)).toBeUndefined()
    expect(mensajeErrorApi({ response: { data: { error: '' } } })).toBeUndefined()
  })
})
