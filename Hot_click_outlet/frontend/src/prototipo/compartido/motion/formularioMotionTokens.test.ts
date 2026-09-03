import { describe, expect, it } from 'vitest'
import {
  DESPLAZAMIENTO_PASO_PX,
  DURACION_ENTRADA_S,
  DURACION_SALIDA_S,
  SPRING_ENTRADA,
  variantesPaso,
} from './formularioMotionTokens'
import { direccionDesdeIndices } from './useDireccionPaso'

describe('formularioMotionTokens', () => {
  it('usa duraciones de UI más cálidas (aún cortas)', () => {
    expect(DURACION_ENTRADA_S).toBeGreaterThan(0.3)
    expect(DURACION_ENTRADA_S).toBeLessThanOrEqual(0.5)
    expect(DURACION_SALIDA_S).toBeLessThanOrEqual(0.35)
  })

  it('entrada de paso usa spring', () => {
    const v = variantesPaso('forward', false)
    expect(v.animate).toMatchObject({
      opacity: 1,
      x: 0,
      transition: SPRING_ENTRADA,
    })
  })

  it('forward sale a la izquierda y entra desde la derecha', () => {
    const v = variantesPaso('forward', false)
    expect(v.initial).toEqual({ opacity: 0, x: DESPLAZAMIENTO_PASO_PX })
    expect(v.exit).toMatchObject({ opacity: 0, x: -DESPLAZAMIENTO_PASO_PX })
  })

  it('back sale a la derecha y entra desde la izquierda', () => {
    const v = variantesPaso('back', false)
    expect(v.initial).toEqual({ opacity: 0, x: -DESPLAZAMIENTO_PASO_PX })
    expect(v.exit).toMatchObject({ opacity: 0, x: DESPLAZAMIENTO_PASO_PX })
  })

  it('reduced motion solo anima opacity', () => {
    const v = variantesPaso('forward', true)
    expect(v.initial).toEqual({ opacity: 0 })
    expect(v.animate).toMatchObject({ opacity: 1 })
  })
})

describe('direccionDesdeIndices', () => {
  it('detecta avance y retroceso', () => {
    expect(direccionDesdeIndices(0, 1)).toBe('forward')
    expect(direccionDesdeIndices(2, 1)).toBe('back')
    expect(direccionDesdeIndices(1, 1)).toBe('forward')
  })
})
