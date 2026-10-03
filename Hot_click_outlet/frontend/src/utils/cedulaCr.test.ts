import { describe, expect, it } from 'vitest'
import { esCedulaCrValida, normalizarCedula } from './cedulaCr'

describe('esCedulaCrValida', () => {
  it('rechaza dígitos repetidos (111111111)', () => {
    expect(esCedulaCrValida('111111111')).toBe(false)
    expect(esCedulaCrValida('3333333333')).toBe(false)
  })
  it('acepta física, jurídica y DIMEX con formato válido', () => {
    expect(esCedulaCrValida('1-0234-0567')).toBe(true)
    expect(esCedulaCrValida('3101123456')).toBe(true)
    expect(esCedulaCrValida('155812345678')).toBe(true)
  })
  it('rechaza largos o caracteres inválidos', () => {
    expect(esCedulaCrValida('12345')).toBe(false)
    expect(esCedulaCrValida('012345678')).toBe(false)
    expect(esCedulaCrValida('1A2345678')).toBe(false)
    expect(esCedulaCrValida('1234567890123')).toBe(false)
  })
  it('normaliza guiones y espacios', () => {
    expect(normalizarCedula(' 1-0234-0567 ')).toBe('102340567')
  })
})
