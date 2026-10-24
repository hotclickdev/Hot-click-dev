import { describe, expect, it } from 'vitest'
import { normalizarCedulaRegistro } from './cedulaRegistro'

describe('normalizarCedulaRegistro', () => {
  it('acepta física, jurídica y DIMEX normalizando', () => {
    expect(normalizarCedulaRegistro('1-2345-6789')).toBe('123456789')
    expect(normalizarCedulaRegistro('3 101 123456')).toBe('3101123456')
    expect(normalizarCedulaRegistro('15581234567')).toBe('15581234567')
    expect(normalizarCedulaRegistro('155812345678')).toBe('155812345678')
  })
  it('rechaza formatos inválidos', () => {
    for (const mala of ['', '12345678', '2101123456', '1234567890123', '1-2345-678a']) {
      expect(normalizarCedulaRegistro(mala)).toBeNull()
    }
  })
})
