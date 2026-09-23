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
