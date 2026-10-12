import { afterEach, describe, expect, it, vi } from 'vitest'
import { MENSAJE_MAYORIA_EDAD } from '@/utils/mayoriaEdad'
import { sincronizarClerk } from './ssoClerkSync'

afterEach(() => {
  vi.unstubAllGlobals()
})

const payload = { nombre: 'Ana', apellido: 'García', fotoUrl: '' }

describe('sincronizarClerk', () => {
  it('pide la declaración si el API responde mayoría de edad', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 400,
      ok: false,
      json: async () => ({ success: false, message: MENSAJE_MAYORIA_EDAD }),
    }))
    const r = await sincronizarClerk('tok', payload, false)
    expect(r).toEqual({ ok: false, requiereEdad: true })
  })

  it('devuelve la sesión si el API acepta', async () => {
    const data = { accessToken: 'jwt', nombre: 'Ana', rol: 'USUARIO_FINAL' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ success: true, data }),
    }))
    const r = await sincronizarClerk('tok', payload, true)
    expect(r).toEqual({ ok: true, data })
  })

  it('no manda email ni clerkUserId en el body (identidad solo del token)', async () => {
    const f = vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({ success: true, data: {} }) })
    vi.stubGlobal('fetch', f)
    await sincronizarClerk('tok', payload, true)
    const [url, init] = f.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/auth/clerk-sync')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(body).not.toHaveProperty('email')
    expect(body).not.toHaveProperty('clerkUserId')
    expect(body).toMatchObject({ nombre: 'Ana', declaraMayoriaEdad: 'true' })
  })

  it('marca el 409 de cuenta vinculada a otro inicio social (P1-01)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 409,
      ok: false,
      json: async () => ({ success: false, message: 'Esta cuenta ya está vinculada' }),
    }))
    const r = await sincronizarClerk('tok', payload, false)
    expect(r).toMatchObject({ ok: false, requiereEdad: false, codigo: 'vinculo-conflicto' })
  })

  it('marca el 401 por correo no verificado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401, ok: false, json: async () => ({ success: false, message: 'El token de Clerk no trae un correo verificado.' }) }))
    const r = await sincronizarClerk('tok', payload, false)
    expect(r).toMatchObject({ ok: false, codigo: 'correo-no-verificado' })
  })
})
