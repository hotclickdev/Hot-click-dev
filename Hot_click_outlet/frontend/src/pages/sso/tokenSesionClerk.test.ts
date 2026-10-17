import { afterEach, describe, expect, it, vi } from 'vitest'
import { MSG_PLANTILLA, obtenerTokenSesion } from './tokenSesionClerk'

const jwt = (claims: object) => `h.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.s`

describe('obtenerTokenSesion', () => {
  afterEach(() => vi.restoreAllMocks())

  it('devuelve el token de la plantilla cuando trae email', async () => {
    const t = jwt({ email: 'a@b.cr', email_verified: true })
    const getToken = vi.fn().mockResolvedValue(t)
    await expect(obtenerTokenSesion(getToken)).resolves.toBe(t)
    expect(getToken).toHaveBeenCalledTimes(1)
    expect(getToken).toHaveBeenCalledWith({ template: 'hotclick-session' })
  })

  it('si la plantilla falla no cae a getToken() simple', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const getToken = vi.fn().mockRejectedValueOnce(new Error('No JWT template exists')).mockResolvedValue(jwt({ sub: 'x' }))
    await expect(obtenerTokenSesion(getToken)).rejects.toThrow(MSG_PLANTILLA)
    expect(getToken).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('plantilla hotclick-session no configurada'), expect.anything())
  })

  it('rechaza un token null o sin email', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(obtenerTokenSesion(vi.fn().mockResolvedValue(null))).rejects.toThrow(MSG_PLANTILLA)
    await expect(obtenerTokenSesion(vi.fn().mockResolvedValue(jwt({ sub: 'x' })))).rejects.toThrow(MSG_PLANTILLA)
  })
})
