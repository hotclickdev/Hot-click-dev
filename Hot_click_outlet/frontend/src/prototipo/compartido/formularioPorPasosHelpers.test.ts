import { describe, expect, it } from 'vitest'
import {
  esPrimerPaso,
  esUltimoPaso,
  etiquetaProgreso,
  indicePasoValido,
  pasoAnterior,
  siguientePasoSiValido,
} from './formularioPorPasosHelpers'

describe('formularioPorPasosHelpers', () => {
  it('indicePasoValido acota fuera de rango', () => {
    expect(indicePasoValido(-1, 4)).toBe(0)
    expect(indicePasoValido(99, 4)).toBe(3)
    expect(indicePasoValido(2, 4)).toBe(2)
    expect(indicePasoValido(0, 0)).toBe(0)
  })

  it('esUltimoPaso y esPrimerPaso', () => {
    expect(esPrimerPaso(0)).toBe(true)
    expect(esPrimerPaso(1)).toBe(false)
    expect(esUltimoPaso(3, 4)).toBe(true)
    expect(esUltimoPaso(2, 4)).toBe(false)
    expect(esUltimoPaso(0, 0)).toBe(false)
  })

  it('etiquetaProgreso', () => {
    expect(etiquetaProgreso(0, 4)).toBe('Paso 1 de 4')
    expect(etiquetaProgreso(3, 4)).toBe('Paso 4 de 4')
  })

  it('siguientePasoSiValido bloquea con error y avanza sin error', () => {
    expect(siguientePasoSiValido(1, 4, 'Falta el nombre')).toBe(1)
    expect(siguientePasoSiValido(1, 4, null)).toBe(2)
    expect(siguientePasoSiValido(3, 4, null)).toBe(3)
  })

  it('pasoAnterior no baja de 0', () => {
    expect(pasoAnterior(0)).toBe(0)
    expect(pasoAnterior(2)).toBe(1)
  })
})
