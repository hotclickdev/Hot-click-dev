import { describe, expect, it } from 'vitest'
import { ERRORES_ONVO, errorOnvo } from './erroresOnvo'
import { ESTADOS_ONVO, porcentajeNoCoincide, validarMotivo, validarPorcentaje } from './adminOnvoHelpers'

describe('S2-29 / S3-22 sección ONVO del admin', () => {
  it('6 estados con color y texto', () => {
    expect(ESTADOS_ONVO).toHaveLength(6)
    expect(ESTADOS_ONVO.every((e) => e.etiqueta && e.clase)).toBe(true)
  })

  it('7 errores de ONVO en lenguaje claro, sin códigos en el texto', () => {
    expect(Object.keys(ERRORES_ONVO)).toHaveLength(7)
    for (const e of Object.values(ERRORES_ONVO)) expect(`${e.titulo} ${e.texto}`).not.toMatch(/\b[45]\d\d\b/)
    expect(errorOnvo({ response: { status: 409 } })).toBe(ERRORES_ONVO.CORREO_EN_ONVO)
    expect(errorOnvo({ response: { status: 500, data: { codigo: 'ENLACE_VENCIDO' } } })).toBe(ERRORES_ONVO.ENLACE_VENCIDO)
    expect(errorOnvo(new Error('red'))).toBe(ERRORES_ONVO.SIN_CONEXION)
  })

  it('avisa si el % no coincide con el plan solo con datos del backend', () => {
    expect(porcentajeNoCoincide(7, 9)).toBe(true)
    expect(porcentajeNoCoincide(7, 7)).toBe(false)
    expect(porcentajeNoCoincide(7, null)).toBe(false)
  })

  it('valida el % y el motivo de pausa (3+ caracteres)', () => {
    expect(validarPorcentaje('7,5').valor).toBe(7.5)
    expect(validarPorcentaje('120').error).toBeTruthy()
    expect(validarMotivo('ab')).toBeTruthy()
    expect(validarMotivo('Fotos con marcas')).toBeNull()
  })
})
