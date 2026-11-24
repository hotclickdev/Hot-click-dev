import { describe, expect, it } from 'vitest'
import {
  FILTROS_INICIALES,
  esConflicto,
  formatearMomento,
  mensajeDeError,
  nombreAsignado,
  paramsDeFiltros,
  puedeResponder,
  textoRespuestaValido,
} from './bandejaHelpers'

describe('bandeja: filtros', () => {
  it('manda vista, estado, página y tamaño; el canal vacío no se manda', () => {
    expect(paramsDeFiltros(FILTROS_INICIALES, 20)).toEqual({ vista: 'TODAS', estado: 'ABIERTA', pagina: 0, tamano: 20 })
    expect(paramsDeFiltros({ vista: 'MIAS', canal: 'INSTAGRAM', estado: 'CERRADA', pagina: 2 }, 20))
      .toEqual({ vista: 'MIAS', canal: 'INSTAGRAM', estado: 'CERRADA', pagina: 2, tamano: 20 })
  })
})

describe('bandeja: responder', () => {
  it('solo con la conversación abierta y dentro de la ventana de 24 h', () => {
    expect(puedeResponder({ estado: 'ABIERTA', ventanaAbierta: true })).toBe(true)
    expect(puedeResponder({ estado: 'ABIERTA', ventanaAbierta: false })).toBe(false)
    expect(puedeResponder({ estado: 'CERRADA', ventanaAbierta: true })).toBe(false)
  })

  it('el texto no puede estar vacío ni pasar de 1000 caracteres', () => {
    expect(textoRespuestaValido('   ')).toBe(false)
    expect(textoRespuestaValido('Hola')).toBe(true)
    expect(textoRespuestaValido('x'.repeat(1000))).toBe(true)
    expect(textoRespuestaValido('x'.repeat(1001))).toBe(false)
  })
})

describe('bandeja: asignación', () => {
  const eq = [{ id: 5, nombre: 'Ana Mora' }]
  const et = { yo: 'Vos', otra: 'Otra persona' }
  it('nombra a quien atiende', () => {
    expect(nombreAsignado({ asignadoAId: null, asignadaAMi: false }, eq, et)).toBeNull()
    expect(nombreAsignado({ asignadoAId: 1, asignadaAMi: true }, eq, et)).toBe('Vos')
    expect(nombreAsignado({ asignadoAId: 5, asignadaAMi: false }, eq, et)).toBe('Ana Mora')
    expect(nombreAsignado({ asignadoAId: 9, asignadaAMi: false }, eq, et)).toBe('Otra persona')
  })
})

describe('bandeja: errores y fechas', () => {
  it('muestra el mensaje del servidor en 409 (ventana vencida) y uno genérico en otros fallos', () => {
    const e409 = { response: { status: 409, data: { message: 'Pasaron más de 24 horas' } } }
    expect(mensajeDeError(e409, 'genérico')).toBe('Pasaron más de 24 horas')
    expect(esConflicto(e409)).toBe(true)
    expect(mensajeDeError({ response: { status: 500, data: { message: 'stack trace' } } }, 'genérico')).toBe('genérico')
    expect(mensajeDeError(new Error('red'), 'genérico')).toBe('genérico')
    expect(esConflicto(null)).toBe(false)
  })

  it('formatea en hora de Costa Rica: hora si es de hoy, día y hora si no', () => {
    const ahora = new Date('2026-11-24T20:00:00Z') // 14:00 en CR
    expect(formatearMomento('2026-11-24T20:05:00Z', ahora)).toBe('14:05')
    expect(formatearMomento('2026-11-20T20:05:00Z', ahora)).toContain('14:05')
    expect(formatearMomento('2026-11-20T20:05:00Z', ahora)).not.toBe('14:05')
    expect(formatearMomento(null)).toBe('')
    expect(formatearMomento('no es fecha')).toBe('')
  })
})
