import { afterEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import api, { esRutaDosFactores } from '@/services/api'

/** Adaptador que responde siempre 401, como el backend ante contraseña o código 2FA incorrectos. */
const siempre401: AxiosAdapter = (config: InternalAxiosRequestConfig) =>
  Promise.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
    status: 401, statusText: 'Unauthorized', data: {}, headers: {}, config,
  }))

describe('api: un 401 de /auth/2fa/* no reintenta con refresh', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete api.defaults.adapter })

  it('esRutaDosFactores reconoce solo las rutas /auth/2fa', () => {
    for (const u of ['/auth/2fa/setup', '/auth/2fa/activate', '/auth/2fa/disable', '/auth/2fa/verify',
      '/auth/2fa/email/send', '/auth/2fa/recovery-codes/regenerate', '/auth/2fa/status?x=1']) {
      expect(esRutaDosFactores(u), u).toBe(true)
    }
    for (const u of ['/auth/login', '/auth/refresh', '/productos', '/auth/2fax', undefined]) {
      expect(esRutaDosFactores(u), String(u)).toBe(false)
    }
  })

  it.each(['/auth/2fa/setup', '/auth/2fa/activate', '/auth/2fa/disable'])(
    'POST %s con 401 se rechaza sin llamar a /auth/refresh',
    async (ruta) => {
      const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'nuevo' } })
      api.defaults.adapter = siempre401
      await expect(api.post(ruta, { contrasena: 'mala' })).rejects.toMatchObject({ response: { status: 401 } })
      expect(refresh).not.toHaveBeenCalled()
    },
  )

  it('control: un 401 de otra ruta sigue intentando el refresh', async () => {
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} })
    api.defaults.adapter = siempre401
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })
    await expect(api.get('/productos')).rejects.toBeTruthy()
    expect(refresh).toHaveBeenCalledWith('/api/auth/refresh', {}, { withCredentials: true })
  })
})
