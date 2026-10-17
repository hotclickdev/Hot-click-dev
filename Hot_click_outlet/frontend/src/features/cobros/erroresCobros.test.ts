import { describe, expect, it } from 'vitest'
import { TEXTO_ESTADO_NO_DISPONIBLE, TEXTO_SOLO_PROPIETARIO, mensajeErrorEstadoCobros } from './erroresCobros'
import { TEXTO_PENDIENTE_DUENO } from '@/utils/erroresContrato'

describe('errores del estado de cobros ONVO (#197)', () => {
  it('403 del personal: solo el propietario', () => {
    expect(mensajeErrorEstadoCobros({ response: { status: 403, data: { success: false, code: 'SOLO_PROPIETARIO', message: 'x' } } })).toBe(TEXTO_SOLO_PROPIETARIO)
    expect(mensajeErrorEstadoCobros({ response: { status: 403, data: { success: false } } })).toBe(TEXTO_SOLO_PROPIETARIO)
  })
  it('501 pendiente del dueño y errores de red', () => {
    expect(mensajeErrorEstadoCobros({ response: { status: 501, data: { code: 'PENDIENTE_DECISION_DUENO' } } })).toBe(TEXTO_PENDIENTE_DUENO)
    expect(mensajeErrorEstadoCobros(new Error('red'))).toBe(TEXTO_ESTADO_NO_DISPONIBLE)
  })
})
