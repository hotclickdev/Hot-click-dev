import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enviarContacto } from './contactoService'

describe('enviarContacto', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
  })

  it('incluye turnstileToken en el JSON cuando hay token', async () => {
    await enviarContacto({
      nombre: 'Ana',
      correo: 'ana@ejemplo.com',
      mensaje: 'Hola',
      turnstileToken: 'tok-contacto-1',
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/contacto',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Ana',
          correo: 'ana@ejemplo.com',
          mensaje: 'Hola',
          turnstileToken: 'tok-contacto-1',
        }),
      }),
    )
  })

  it('omite turnstileToken si está vacío', async () => {
    await enviarContacto({
      nombre: 'Ana',
      correo: 'ana@ejemplo.com',
      mensaje: 'Hola',
      turnstileToken: '',
    })
    const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(body.turnstileToken).toBeUndefined()
  })
})
