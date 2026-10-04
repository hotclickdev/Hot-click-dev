import { afterEach, describe, expect, it } from 'vitest'
import {
  MAX_MS_RESTAURAR, MAX_POSICIONES, cambiaDePagina, debeReintentar, destinoScroll, guardarPosicion, olvidarPosiciones, posicionGuardada,
} from './restauracionScroll'

afterEach(() => olvidarPosiciones())

describe('restauración del scroll al navegar', () => {
  it('atrás/adelante vuelve a la posición guardada; enlace nuevo y reemplazo van arriba', () => {
    expect(destinoScroll('POP', 1480)).toBe(1480)
    expect(destinoScroll('PUSH', 1480)).toBe(0)
    expect(destinoScroll('REPLACE', 1480)).toBe(0)
  })

  it('POP sin posición guardada (primera carga o recarga) empieza arriba', () => {
    expect(destinoScroll('POP', undefined)).toBe(0)
  })

  it('guarda por entrada del historial, redondea y no acepta negativos', () => {
    guardarPosicion('a', 1200.6)
    guardarPosicion('b', -30)
    expect(posicionGuardada('a')).toBe(1201)
    expect(posicionGuardada('b')).toBe(0)
    expect(posicionGuardada('c')).toBeUndefined()
  })

  it('descarta la entrada más vieja al pasar el máximo', () => {
    for (let i = 0; i <= MAX_POSICIONES; i += 1) guardarPosicion(`k${i}`, i)
    expect(posicionGuardada('k0')).toBeUndefined()
    expect(posicionGuardada(`k${MAX_POSICIONES}`)).toBe(MAX_POSICIONES)
  })

  it('un reemplazo con la misma URL no cuenta como página nueva', () => {
    expect(cambiaDePagina('REPLACE', '/productos', '/productos')).toBe(false)
    expect(cambiaDePagina('REPLACE', '/productos?cat=2', '/productos')).toBe(true)
    expect(cambiaDePagina('POP', '/productos', '/productos')).toBe(true)
    expect(cambiaDePagina('PUSH', '/productos', null)).toBe(true)
  })

  it('reintenta mientras la página no llegó a la posición y queda tiempo', () => {
    expect(debeReintentar(1500, 300, 16)).toBe(true)
    expect(debeReintentar(1500, 1500, 16)).toBe(false)
    expect(debeReintentar(1500, 300, MAX_MS_RESTAURAR)).toBe(false)
  })
})
