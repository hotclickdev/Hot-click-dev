import { describe, expect, it } from 'vitest'
import { destinoTab } from './focoAtrapado'

describe('destinoTab', () => {
  it('sin controles no mueve el foco', () => {
    expect(destinoTab(0, -1, false)).toBeNull()
    expect(destinoTab(0, -1, true)).toBeNull()
  })

  it('desde fuera o desde el contenedor entra por el primero (Tab) o el último (Mayús+Tab)', () => {
    expect(destinoTab(3, -1, false)).toBe(0)
    expect(destinoTab(3, -1, true)).toBe(2)
  })

  it('da la vuelta en los extremos', () => {
    expect(destinoTab(3, 2, false)).toBe(0)
    expect(destinoTab(3, 0, true)).toBe(2)
    expect(destinoTab(1, 0, false)).toBe(0)
  })

  it('en el medio deja que el navegador avance', () => {
    expect(destinoTab(3, 1, false)).toBeNull()
    expect(destinoTab(3, 1, true)).toBeNull()
    expect(destinoTab(3, 0, false)).toBeNull()
  })
})
