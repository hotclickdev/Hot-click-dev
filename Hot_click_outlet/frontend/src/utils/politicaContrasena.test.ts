import { describe, expect, it } from 'vitest'
import { cumplePoliticaContrasena } from './politicaContrasena'

describe('cumplePoliticaContrasena', () => {
  it('rechaza corta, sin mayúscula o sin número', () => {
    expect(cumplePoliticaContrasena('Abcdef1')).toBe(false)
    expect(cumplePoliticaContrasena('abcdefg1')).toBe(false)
    expect(cumplePoliticaContrasena('Abcdefgh')).toBe(false)
    expect(cumplePoliticaContrasena('')).toBe(false)
  })
  it('acepta 8 con mayúscula y número', () => {
    expect(cumplePoliticaContrasena('Abcdefg1')).toBe(true)
  })
})
