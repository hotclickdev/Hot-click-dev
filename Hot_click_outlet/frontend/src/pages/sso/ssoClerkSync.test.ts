import { afterEach, describe, expect, it, vi } from 'vitest'
import { MENSAJE_MAYORIA_EDAD } from '@/utils/mayoriaEdad'
import { sincronizarClerk } from './ssoClerkSync'

afterEach(() => {
  vi.unstubAllGlobals()
})

const payload = { email: 'a@b.com', nombre: 'Ana', apellido: 'García', fotoUrl: '' }

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
})
