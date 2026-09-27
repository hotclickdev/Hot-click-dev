import { describe, expect, it } from 'vitest'
import { escalonPalabra, palabrasDe, siguienteIndice } from './consultaRotativaHelpers'

describe('consulta rotativa', () => {
  it('rota en círculo por las preguntas', () => {
    expect(siguienteIndice(0, 5)).toBe(1)
    expect(siguienteIndice(4, 5)).toBe(0)
    expect(siguienteIndice(3, 0)).toBe(0)
  })

  it('separa la pregunta en palabras sin vacíos', () => {
    expect(palabrasDe('  ¿Qué le  regalo a mi pareja? ')).toEqual(['¿Qué', 'le', 'regalo', 'a', 'mi', 'pareja?'])
  })

  it('cada palabra parte de un escalón más bajo y 60 ms después', () => {
    expect(escalonPalabra(0)).toEqual({ desdePx: 12, retrasoMs: 0 })
    expect(escalonPalabra(3)).toEqual({ desdePx: 30, retrasoMs: 180 })
  })
})
