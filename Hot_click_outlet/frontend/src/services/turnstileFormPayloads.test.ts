import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({
  default: { post: vi.fn().mockResolvedValue({ data: {} }) },
}))

import api from './api'
import { enviarSolicitudEspecial } from './solicitudEspecialService'
import { servicioService } from './servicioService'
import { encargoService } from './encargoService'

const postMock = api.post as ReturnType<typeof vi.fn>

describe('payloads con turnstileToken', () => {
  beforeEach(() => {
    postMock.mockClear()
  })

  it('solicitudEspecial append turnstileToken al FormData', async () => {
    await enviarSolicitudEspecial({
      nombre: 'Luis',
      whatsapp: '88888888',
      turnstileToken: 'tok-esp-1',
    })
    expect(postMock).toHaveBeenCalledWith(
      '/public/solicitud-especial',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    )
    const fd = postMock.mock.calls[0][1] as FormData
    expect(fd.get('turnstileToken')).toBe('tok-esp-1')
    expect(fd.get('nombre')).toBe('Luis')
  })

  it('servicioService.crear incluye turnstileToken en el body', async () => {
    await servicioService.crear({
      descripcion: 'Busco un monitor',
      telefonoContacto: '88887777',
      turnstileToken: 'tok-svc-1',
    })
    expect(postMock).toHaveBeenCalledWith('/servicios', {
      descripcion: 'Busco un monitor',
      telefonoContacto: '88887777',
      turnstileToken: 'tok-svc-1',
    })
  })

  it('servicioService.crear omite turnstileToken vacío', async () => {
    await servicioService.crear({
      descripcion: 'Busco un monitor',
      turnstileToken: '',
    })
    expect(postMock).toHaveBeenCalledWith('/servicios', {
      descripcion: 'Busco un monitor',
    })
  })

  it('encargoService.crear incluye turnstileToken en el body', async () => {
    await encargoService.crear({
      productoId: 42,
      nombreCliente: 'María',
      email: 'maria@ejemplo.com',
      imagenes: ['https://cdn.example/a.jpg'],
      turnstileToken: 'tok-enc-1',
    })
    expect(postMock).toHaveBeenCalledWith('/public/encargos', {
      productoId: 42,
      nombreCliente: 'María',
      email: 'maria@ejemplo.com',
      imagenes: ['https://cdn.example/a.jpg'],
      turnstileToken: 'tok-enc-1',
    })
  })
})
