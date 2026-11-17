import { describe, expect, it } from 'vitest'
import { digitosTelefonoCR, formatTelefonoCR } from './telefono'

describe('formatTelefonoCR (R2: 0000-0002)', () => {
  it('formatea con y sin prefijo del país', () => {
    expect(formatTelefonoCR('00000002')).toBe('0000-0002')
    expect(formatTelefonoCR('+50600000002')).toBe('0000-0002')
    expect(formatTelefonoCR('+506 0000-0000')).toBe('0000-0000')
    expect(formatTelefonoCR('0000 0002')).toBe('0000-0002')
  })

  it('mientras se escribe pone el guion después del cuarto dígito', () => {
    expect(formatTelefonoCR('8888')).toBe('8888')
    expect(formatTelefonoCR('00000')).toBe('0000-0')
    expect(formatTelefonoCR('')).toBe('')
    expect(formatTelefonoCR(null)).toBe('')
  })

  it('un número extranjero se deja como vino', () => {
    expect(formatTelefonoCR('+1 305 555 0100')).toBe('+1 305 555 0100')
  })

  it('digitosTelefonoCR quita prefijo y separadores', () => {
    expect(digitosTelefonoCR('+506 0000-0002 extra99')).toBe('00000002')
    expect(digitosTelefonoCR('0000-0002')).toBe('00000002')
  })
})

describe('pegadoTelefonoCR (Pyme +506)', () => {
  it('normaliza el pegado con o sin prefijo', async () => {
    const { pegadoTelefonoCR } = await import('./telefono')
    expect(pegadoTelefonoCR('+506 0000-0002')).toBe('+50600000002')
    expect(pegadoTelefonoCR('0000 0002')).toBe('+50600000002')
    expect(pegadoTelefonoCR('+1 305 555 1234')).toBeNull()
  })
})
