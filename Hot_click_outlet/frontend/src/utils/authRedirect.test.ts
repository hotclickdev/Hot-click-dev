import { describe, expect, it } from 'vitest'
import { destinoPostLogin, rutaLoginConRetorno } from './authRedirect'

describe('destino después del login', () => {
  it('acepta rutas internas con query', () => {
    expect(destinoPostLogin('/perfil')).toBe('/perfil')
    expect(destinoPostLogin('/servicios?vista=garantia')).toBe('/servicios?vista=garantia')
  })

  it('rechaza destinos que salen del sitio', () => {
    for (const externo of ['https://evil.example', '//evil.example', '/\\evil.example', '/\t/evil.example', '/\n/evil.example', 'perfil', '']) {
      expect(destinoPostLogin(externo)).toBe('/')
    }
    expect(destinoPostLogin(undefined)).toBe('/')
    expect(destinoPostLogin(42)).toBe('/')
  })

  it('arma el login con retorno solo cuando hay adónde volver', () => {
    expect(rutaLoginConRetorno('/mis-pedidos')).toBe('/login?redirect=%2Fmis-pedidos')
    expect(rutaLoginConRetorno('/')).toBe('/login')
    expect(rutaLoginConRetorno('/login')).toBe('/login')
    expect(rutaLoginConRetorno('/\\evil.example')).toBe('/login')
  })
})

describe('/pyme: el login con retorno no se anida', () => {
  it('un redirect que ya apunta a /login usa su destino interno', () => {
    expect(rutaLoginConRetorno('/login?redirect=%2Fpyme')).toBe('/login?redirect=%2Fpyme')
    expect(rutaLoginConRetorno('/login?redirect=%2Flogin%3Fredirect%3D%252Fpyme')).toBe('/login?redirect=%2Fpyme')
    expect(rutaLoginConRetorno('/login')).toBe('/login')
    expect(rutaLoginConRetorno('/login?redirect=https%3A%2F%2Fevil.example')).toBe('/login')
  })
})
