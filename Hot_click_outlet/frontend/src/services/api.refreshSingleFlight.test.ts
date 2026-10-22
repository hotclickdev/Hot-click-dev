import '@/test-utils/memoriaLocalStorage'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

vi.mock('@/utils/sentryClient', () => ({ syncSentryUser: vi.fn() }))
vi.mock('@/utils/analytics', () => ({ identifyUser: vi.fn(), resetAnalyticsUser: vi.fn() }))

import api, { refrescarUnaVez, __resetAuthRefreshParaTests } from '@/services/api'

function sesion(token: string) {
  localStorage.setItem('hotclick-auth', JSON.stringify({ state: { token }, version: 1 }))
}

/** Adapter falso: 401 salvo que venga el token nuevo. */
function adapter401Hasta(tokenBueno: string) {
  return vi.fn(async (config: InternalAxiosRequestConfig) => {
    const auth = String(config.headers?.Authorization ?? '')
    if (auth === `Bearer ${tokenBueno}`) {
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
    }
    const response = { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config }
    throw new AxiosError('401', 'ERR_BAD_REQUEST', config, null, response as never)
  })
}

describe('api: refresh single-flight ante 401', () => {
  let postSpy: MockInstance<typeof axios.post>

  beforeEach(() => {
    __resetAuthRefreshParaTests()
    localStorage.clear()
    postSpy = vi.spyOn(axios, 'post')
  })
  afterEach(() => {
    postSpy.mockRestore()
    api.defaults.adapter = undefined
    vi.unstubAllGlobals()
  })

  it('5 llamadas concurrentes a refrescarUnaVez hacen UN solo POST', async () => {
    postSpy.mockResolvedValue({ data: { accessToken: 'nuevo' } })
    const r = await Promise.all([1, 2, 3, 4, 5].map(() => refrescarUnaVez()))
    expect(r).toEqual(['nuevo', 'nuevo', 'nuevo', 'nuevo', 'nuevo'])
    expect(postSpy).toHaveBeenCalledTimes(1)
  })

  it('5 requests con 401 en paralelo comparten un refresh y se reintentan con el token nuevo', async () => {
    sesion('viejo')
    let resolver!: (v: unknown) => void
    postSpy.mockReturnValue(new Promise((res) => { resolver = res }) as never)
    const adapter = adapter401Hasta('nuevo')
    api.defaults.adapter = adapter as never

    const reqs = [1, 2, 3, 4, 5].map((i) => api.get(`/x/${i}`))
    await vi.waitFor(() => expect(adapter).toHaveBeenCalledTimes(5))
    resolver({ data: { accessToken: 'nuevo' } })
    const res = await Promise.all(reqs)

    expect(res.every((r) => r.status === 200)).toBe(true)
    expect(postSpy).toHaveBeenCalledTimes(1)
    expect(adapter).toHaveBeenCalledTimes(10)
  })

  it('si el refresh falla, cierra sesión una sola vez y no entra en bucle', async () => {
    sesion('viejo')
    const loc = { pathname: '/admin', search: '', href: '/admin' }
    vi.stubGlobal('location', loc)
    postSpy.mockRejectedValue(new Error('401'))
    const removeSpy = vi.spyOn(localStorage, 'removeItem')
    const adapter = adapter401Hasta('nunca')
    api.defaults.adapter = adapter as never

    const res = await Promise.allSettled([1, 2, 3].map((i) => api.get(`/y/${i}`)))

    expect(res.every((r) => r.status === 'rejected')).toBe(true)
    expect(postSpy).toHaveBeenCalledTimes(1)
    expect(adapter).toHaveBeenCalledTimes(3) // sin reintento ni bucle
    expect(removeSpy.mock.calls.filter(([k]) => k === 'hotclick-auth')).toHaveLength(1)
    expect(loc.href).toContain('/login')
    removeSpy.mockRestore()
  })

  it('un 401 del propio /auth/refresh no dispara otro refresh', async () => {
    const adapter = adapter401Hasta('nunca')
    api.defaults.adapter = adapter as never
    await expect(api.post('/auth/refresh', {})).rejects.toBeTruthy()
    expect(postSpy).not.toHaveBeenCalled()
  })
})
