import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.hoisted(() => {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => { store.clear() },
    key: () => null,
    length: 0,
  } as Storage
})
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import api, { esRutaInvitado } from './api'
import useAuthStore from '@/store/authStore'
import { destinoPostLogin, rutaLoginConRetorno } from '@/utils/authRedirect'

const SESION_VENCIDA = JSON.stringify({ state: { token: 'vencido', userId: 9, userEmail: 'x@x.com', userRole: 'CLIENTE' }, version: 0 })

function irA(pathname: string) {
  const loc = { pathname, search: '', href: `https://hotclick.lat${pathname}` }
  vi.stubGlobal('location', loc)
  return loc
}

describe('checkout invitado con sesión vencida', () => {
  const vistos: Array<string | undefined> = []
  beforeEach(() => {
    vistos.length = 0
    localStorage.setItem('hotclick-auth', SESION_VENCIDA)
    localStorage.setItem('hotclick-cart', JSON.stringify({ state: { items: [{ id: 1, cantidad: 1 }] }, version: 0 }))
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh 400'))
    api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const auth = config.headers.Authorization as string | undefined
      vistos.push(auth)
      if (auth) {
        throw new AxiosError('401', 'ERR', config, null, { status: 401, statusText: '', headers: {}, config, data: {} })
      }
      return { status: 200, statusText: 'OK', headers: {}, config, data: { ok: true } }
    }
  })
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('en /checkout no redirige a login: sigue como invitado y conserva el carrito', async () => {
    const loc = irA('/checkout')
    const { data } = await api.get('/usuarios/9')
    expect(data).toEqual({ ok: true })
    expect(loc.href).toBe('https://hotclick.lat/checkout')
    expect(vistos).toEqual(['Bearer vencido', undefined])
    expect(useAuthStore.getState().token).toBeNull()
    expect(localStorage.getItem('hotclick-cart')).toContain('"cantidad":1')
  })

  it('fuera del flujo de compra mantiene el redirect a login', async () => {
    const loc = irA('/perfil')
    await expect(api.get('/usuarios/9')).rejects.toBeTruthy()
    expect(loc.href).toBe('/login?redirect=%2Fperfil')
  })

  it('rutas de invitado', () => {
    expect(esRutaInvitado('/checkout')).toBe(true)
    expect(esRutaInvitado('/carrito')).toBe(true)
    expect(esRutaInvitado('/pago/tilopay/respuesta')).toBe(true)
    expect(esRutaInvitado('/checkoutx')).toBe(false)
    expect(esRutaInvitado('/perfil')).toBe(false)
  })
})

describe('Ingresar desde /checkout vuelve a /checkout sin open redirect', () => {
  it('arma el retorno y lo valida', () => {
    expect(rutaLoginConRetorno('/checkout')).toBe('/login?redirect=%2Fcheckout')
    expect(destinoPostLogin(decodeURIComponent('%2Fcheckout'))).toBe('/checkout')
    expect(destinoPostLogin('//evil.com/checkout')).toBe('/')
    expect(destinoPostLogin('https://evil.com')).toBe('/')
    expect(destinoPostLogin('/\\evil.com')).toBe('/')
  })
})
