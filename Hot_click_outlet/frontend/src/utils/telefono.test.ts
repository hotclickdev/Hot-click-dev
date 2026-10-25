import { describe, expect, it } from 'vitest'
import { digitosTelefonoCR, formatTelefonoCR } from './telefono'

describe('formatTelefonoCR (R2: 8888-1234)', () => {
  it('formatea con y sin prefijo del país', () => {
    expect(formatTelefonoCR('88881234')).toBe('8888-1234')
    expect(formatTelefonoCR('+50688881234')).toBe('8888-1234')
    expect(formatTelefonoCR('+506 0000-0000')).toBe('0000-0000')
    expect(formatTelefonoCR('8888 1234')).toBe('8888-1234')
  })

  it('mientras se escribe pone el guion después del cuarto dígito', () => {
    expect(formatTelefonoCR('8888')).toBe('8888')
    expect(formatTelefonoCR('88881')).toBe('8888-1')
    expect(formatTelefonoCR('')).toBe('')
    expect(formatTelefonoCR(null)).toBe('')
  })

  it('un número extranjero se deja como vino', () => {
    expect(formatTelefonoCR('+1 305 555 0100')).toBe('+1 305 555 0100')
  })

  it('digitosTelefonoCR quita prefijo y separadores', () => {
    expect(digitosTelefonoCR('+506 8888-1234 extra99')).toBe('88881234')
    expect(digitosTelefonoCR('8888-1234')).toBe('88881234')
  })
})

describe('pegadoTelefonoCR (Pyme +506)', () => {
  it('normaliza el pegado con o sin prefijo', async () => {
    const { pegadoTelefonoCR } = await import('./telefono')
    expect(pegadoTelefonoCR('+506 8888-1234')).toBe('+50688881234')
    expect(pegadoTelefonoCR('8888 1234')).toBe('+50688881234')
    expect(pegadoTelefonoCR('+1 305 555 1234')).toBeNull()
  })
})
