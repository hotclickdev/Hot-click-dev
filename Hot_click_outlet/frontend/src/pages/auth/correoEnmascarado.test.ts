import { describe, expect, it } from 'vitest'
import { correoEnmascarado } from './authHelpers'

describe('correoEnmascarado', () => {
  it('deja ver solo la primera y la última letra antes de la arroba', () => {
    expect(correoEnmascarado('ana.solis@gmail.com')).toBe('a••••s@gmail.com')
  })

  it('con un usuario de una o dos letras no repite ni descubre el resto', () => {
    expect(correoEnmascarado('ab@x.com')).toBe('a••••@x.com')
    expect(correoEnmascarado('a@x.com')).toBe('a••••@x.com')
  })

  it('un texto que no es un correo se devuelve igual', () => {
    expect(correoEnmascarado('sin-arroba')).toBe('sin-arroba')
  })
})
