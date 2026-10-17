import { describe, expect, it } from 'vitest'
import {
  TEXTO_FRECUENCIA_INVALIDA, TEXTO_FRECUENCIA_NO_DISPONIBLE, TEXTO_FRECUENCIA_NO_GUARDADA, TEXTO_FRECUENCIA_SOLO_PROPIETARIO,
  mensajeErrorCargaFrecuencia, mensajeErrorGuardarFrecuencia,
} from './erroresFrecuencia'
import { frecuenciaApi, normalizarFrecuencia, type Frecuencia } from './frecuenciaApi'

const error = (status: number, data?: unknown) => ({ response: { status, data } })

describe('S2-28 frecuencia según el contrato de #197', () => {
  it('actual null (sin elección) no se rellena con un valor por defecto', () => {
    expect(normalizarFrecuencia({ actual: null, pendiente: null })).toEqual({ actual: null, pendiente: null })
  })
  it('traduce 400 FRECUENCIA_INVALIDA y 403 del personal', () => {
    expect(mensajeErrorGuardarFrecuencia(error(400, { code: 'FRECUENCIA_INVALIDA' }))).toBe(TEXTO_FRECUENCIA_INVALIDA)
    expect(mensajeErrorGuardarFrecuencia(error(403))).toBe(TEXTO_FRECUENCIA_SOLO_PROPIETARIO)
    expect(mensajeErrorGuardarFrecuencia(new Error('red'))).toBe(TEXTO_FRECUENCIA_NO_GUARDADA)
    expect(mensajeErrorCargaFrecuencia(error(403))).toBe(TEXTO_FRECUENCIA_SOLO_PROPIETARIO)
    expect(mensajeErrorCargaFrecuencia(error(404))).toBe(TEXTO_FRECUENCIA_NO_DISPONIBLE)
  })

  it('cualquier 400 se muestra en voseo, aunque cambie el code', () => {
    expect(mensajeErrorGuardarFrecuencia(error(400))).toBe(TEXTO_FRECUENCIA_INVALIDA)
    expect(mensajeErrorGuardarFrecuencia(error(400, { code: 'OTRO' }))).toBe(TEXTO_FRECUENCIA_INVALIDA)
  })
  it('nunca manda una frecuencia vacía', async () => {
    await expect(frecuenciaApi.cambiar('' as unknown as Frecuencia)).rejects.toThrow()
  })
})
