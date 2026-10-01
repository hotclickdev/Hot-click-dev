import { describe, expect, it } from 'vitest'
import { esSinConexion, navegadorSinRed } from './conexionHelpers'

describe('navegadorSinRed', () => {
  it('detecta onLine=false', () => {
    expect(navegadorSinRed({ onLine: false })).toBe(true)
    expect(navegadorSinRed({ onLine: true })).toBe(false)
  })
  it('sin navigator asume conectado', () => {
    expect(navegadorSinRed(undefined)).toBe(false)
  })
})

describe('esSinConexion', () => {
  const enLinea = { onLine: true }
  it('sin red del navegador cualquier error cuenta', () => {
    expect(esSinConexion(new Error('x'), { onLine: false })).toBe(true)
  })
  it('error de red de axios sin respuesta', () => {
    expect(esSinConexion({ code: 'ERR_NETWORK', message: 'Network Error' }, enLinea)).toBe(true)
  })
  it('una respuesta del servidor no es falta de conexión', () => {
    expect(esSinConexion({ code: 'ERR_BAD_RESPONSE', response: { status: 500 } }, enLinea)).toBe(false)
  })
  it('valores que no son errores', () => {
    expect(esSinConexion(null, enLinea)).toBe(false)
    expect(esSinConexion('boom', enLinea)).toBe(false)
  })
})
