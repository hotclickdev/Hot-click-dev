import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { capturarTokenDeUrl, extraerTokenDeUbicacion, guardarParaLogin, olvidarToken, tomarToken } from './invitacionToken'

const TOK = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-ab'

/** Ventana mínima: location se actualiza con replaceState, como el navegador. */
function ventana(url: string) {
  const u = new URL(url, 'https://hotclick.lat')
  const loc = { pathname: u.pathname, search: u.search, hash: u.hash }
  const replaceState = vi.fn((_s: unknown, _t: string, nueva: string) => {
    const n = new URL(nueva, 'https://hotclick.lat')
    loc.pathname = n.pathname; loc.search = n.search; loc.hash = n.hash
  })
  return { win: { location: loc, history: { state: null, replaceState } } as unknown as Pick<Window, 'location' | 'history'>, loc, replaceState }
}

function fakeSessionStorage() {
  const m = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v) },
    removeItem: (k: string) => { m.delete(k) },
  })
  return m
}

describe('capturarTokenDeUrl: leer #t=, guardar en memoria y limpiar la barra YA', () => {
  beforeEach(() => { olvidarToken(); fakeSessionStorage() })

  it('lee #t=, lo guarda en memoria y deja /equipo/invitacion sin hash', () => {
    const { win, loc, replaceState } = ventana(`/equipo/invitacion#t=${TOK}`)
    expect(capturarTokenDeUrl(win)).toBe(true)
    expect(replaceState).toHaveBeenCalledWith(null, '', '/equipo/invitacion')
    expect(`${loc.pathname}${loc.search}${loc.hash}`).toBe('/equipo/invitacion')
    expect(`${loc.pathname}${loc.search}${loc.hash}`).not.toContain(TOK)
    expect(tomarToken()).toBe(TOK)
  })

  it('un enlace viejo con el token en el path o en ?t= también se limpia', () => {
    const a = ventana(`/equipo/invitacion/${TOK}`)
    expect(capturarTokenDeUrl(a.win)).toBe(true)
    expect(a.loc.pathname).toBe('/equipo/invitacion')
    expect(tomarToken()).toBe(TOK)
    olvidarToken()
    const b = ventana(`/equipo/invitacion?t=${TOK}`)
    expect(capturarTokenDeUrl(b.win)).toBe(true)
    expect(b.loc.search).toBe('')
    expect(tomarToken()).toBe(TOK)
  })

  it('segunda llamada con la barra ya limpia no hace nada; otras rutas no se tocan', () => {
    const { win, replaceState } = ventana('/equipo/invitacion')
    expect(capturarTokenDeUrl(win)).toBe(false)
    expect(replaceState).not.toHaveBeenCalled()
    const otra = ventana(`/productos#t=${TOK}`)
    expect(capturarTokenDeUrl(otra.win)).toBe(false)
    expect(otra.replaceState).not.toHaveBeenCalled()
  })

  it('un hash con formato inválido se limpia pero no se toma como token', () => {
    const { win, loc } = ventana('/equipo/invitacion#t=corto')
    expect(capturarTokenDeUrl(win)).toBe(false)
    expect(loc.hash).toBe('')
    expect(tomarToken()).toBeNull()
  })

  it('si replaceState falla, no revienta (la analítica sanitiza igual)', () => {
    const { win } = ventana(`/equipo/invitacion#t=${TOK}`)
    ;(win.history as unknown as { replaceState: () => void }).replaceState = () => { throw new Error('bloqueado') }
    expect(() => capturarTokenDeUrl(win)).not.toThrow()
    expect(tomarToken()).toBe(TOK)
  })

  it('extraerTokenDeUbicacion', () => {
    expect(extraerTokenDeUbicacion({ pathname: '/equipo/invitacion', search: '', hash: `#t=${TOK}` })).toBe(TOK)
    expect(extraerTokenDeUbicacion({ pathname: '/equipo/invitacion', search: '', hash: '' })).toBeNull()
  })
})

describe('salto a login: sessionStorage de un solo uso, nunca path ni query', () => {
  let ss: Map<string, string>
  beforeEach(() => { olvidarToken(); ss = fakeSessionStorage() })

  it('guardarParaLogin → tomarToken lo devuelve UNA vez y lo borra', () => {
    guardarParaLogin(TOK)
    expect(ss.size).toBe(1)
    expect(tomarToken()).toBe(TOK)
    expect(ss.size).toBe(0)
  })

  it('vencido o corrupto no sirve', () => {
    ss.set('hc-inv-token', JSON.stringify({ t: TOK, exp: Date.now() - 1 }))
    expect(tomarToken()).toBeNull()
    ss.set('hc-inv-token', 'no-es-json')
    expect(tomarToken()).toBeNull()
  })

  it('olvidarToken (al aceptar o al salir) no deja rastro', () => {
    guardarParaLogin(TOK)
    olvidarToken()
    expect(ss.size).toBe(0)
    expect(tomarToken()).toBeNull()
  })
})

describe('AceptarInvitacionEquipoPage: el token solo viaja en el body', () => {
  const fuente = readFileSync('src/pages/auth/AceptarInvitacionEquipoPage.tsx', 'utf8')

  it('las llamadas a la API llevan { token } en el body, no en el path', () => {
    expect(fuente).toContain("api.post('/auth/equipo-invitacion/consultar', { token })")
    expect(fuente).toContain("api.post('/auth/equipo-invitacion/aceptar-cuenta-nueva', { token, contrasena })")
    expect(fuente).toContain("api.post('/equipo-invitaciones/aceptar', { token })")
    expect(fuente).not.toMatch(/equipo-invitacion[^'"`]*\$\{/)
    expect(fuente).not.toContain('useParams')
  })

  it('el login no lleva el token en el redirect', () => {
    expect(fuente).toContain('guardarParaLogin(token)')
    expect(fuente).toContain('rutaLoginConRetorno(RUTA_INVITACION)')
    expect(fuente).not.toMatch(/redirect=.*token/)
  })
})
