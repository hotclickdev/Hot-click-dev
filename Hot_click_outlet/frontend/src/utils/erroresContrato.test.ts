import { describe, expect, it } from 'vitest'
import { TEXTO_PENDIENTE_DUENO, TEXTO_SIN_ACCESO_NEGOCIO, codigoError, esPendienteDueno, esSinAccesoNegocio, estadoError, mensajeErrorContrato } from './erroresContrato'

const error = (status: number, data?: unknown) => ({ response: { status, data } })

describe('errores de contrato', () => {
  it('501 PENDIENTE_DECISION_DUENO se muestra como «Todavía no disponible»', () => {
    const e = error(501, { success: false, code: 'PENDIENTE_DECISION_DUENO', historia: 'S5-21', message: 'Todavía no disponible: …' })
    expect(esPendienteDueno(e)).toBe(true)
    expect(esPendienteDueno(error(501))).toBe(true)
    expect(mensajeErrorContrato(e)).toBe(TEXTO_PENDIENTE_DUENO)
    expect(TEXTO_PENDIENTE_DUENO.startsWith('Todavía no disponible')).toBe(true)
  })

  it('403 SIN_ACCESO_NEGOCIO tiene su propio texto', () => {
    const e = error(403, { success: false, code: 'SIN_ACCESO_NEGOCIO', message: 'No tenés acceso a ese negocio' })
    expect(esSinAccesoNegocio(e)).toBe(true)
    expect(mensajeErrorContrato(e)).toBe(TEXTO_SIN_ACCESO_NEGOCIO)
    expect(esSinAccesoNegocio(error(403))).toBe(false)
  })

  it('otros errores no se traducen', () => {
    expect(mensajeErrorContrato(error(500, { code: 'OTRO' }))).toBeNull()
    expect(mensajeErrorContrato(new Error('red'))).toBeNull()
    expect(codigoError(null)).toBeNull()
    expect(estadoError({})).toBeUndefined()
  })
})
