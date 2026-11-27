import { describe, expect, it } from 'vitest'
import { authDataRegistroEmpresa, MIN_PASSWORD } from './registroEmpresaHelpers'

describe('authDataRegistroEmpresa', () => {
  it('lee accessToken del body ya desempaquetado por el interceptor', () => {
    const data = authDataRegistroEmpresa({
      accessToken: 'tok',
      refreshToken: 'ref',
      correo: 'a@b.com',
      rol: 'EMPRENDEDOR',
      empresaId: 1,
    })
    expect(data?.accessToken).toBe('tok')
    expect(data?.empresaId).toBe(1)
  })

  it('acepta envelope anidado residual', () => {
    const data = authDataRegistroEmpresa({
      data: { accessToken: 'nested', correo: 'x@y.com' },
    })
    expect(data?.accessToken).toBe('nested')
  })

  it('devuelve undefined sin token', () => {
    expect(authDataRegistroEmpresa({})).toBeUndefined()
    expect(authDataRegistroEmpresa(null)).toBeUndefined()
  })
})

describe('MIN_PASSWORD', () => {
  it('coincide con el mínimo del backend (8)', () => {
    expect(MIN_PASSWORD).toBe(8)
  })
})

describe('registro Pyme: opcional y errores legibles', () => {
  it('teléfono con solo código de país no se envía', async () => {
    const { telefonoOpcional, errorRegistroLegible } = await import('./registroEmpresaHelpers')
    expect(telefonoOpcional('+506')).toBeUndefined()
    expect(telefonoOpcional('+506 ')).toBeUndefined()
    expect(telefonoOpcional('')).toBeUndefined()
    expect(telefonoOpcional('+50600000002')).toBe('+50600000002')
    expect(errorRegistroLegible('telefonoAdmin: formato inválido')).toBe('Teléfono personal: formato inválido')
  })
  it('la situación fiscal no viene premarcada', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('../RegistroEmpresaPage.tsx', import.meta.url), 'utf8')
    expect(src).toContain("situacionFiscal: ''")
  })
})
