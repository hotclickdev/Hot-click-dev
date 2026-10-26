import { describe, expect, it } from 'vitest'
import { digitosWa, textoTelefono, urlWa } from './soporteTelefono'
import { construirContactPageJsonLd } from '@/pages/contacto/contactoHelpers'

describe('soporteTelefono', () => {
  it('vacío: sin dígitos, sin enlace y JSON-LD sin telephone ni wa.me', () => {
    expect(digitosWa('')).toBe('')
    expect(digitosWa(undefined)).toBe('')
    expect(urlWa('')).toBeNull()
    const ld = JSON.stringify(construirContactPageJsonLd('', ''))
    expect(ld).not.toContain('telephone')
    expect(ld).not.toContain('wa.me')
  })
  it('configurado: usa el valor (fake)', () => {
    expect(digitosWa('+000 0000 0000')).toBe('00000000000')
    expect(textoTelefono(' +000 0000 0000 ')).toBe('+000 0000 0000')
    const ld = JSON.stringify(construirContactPageJsonLd('+000 0000 0000', '00000000000'))
    expect(ld).toContain('"telephone":"+000 0000 0000"')
    expect(ld).toContain('https://wa.me/00000000000')
  })
})
