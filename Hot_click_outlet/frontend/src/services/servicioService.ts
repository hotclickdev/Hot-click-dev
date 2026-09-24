import api from './api'
import type { Id, JsonBody } from '@/types/api'

export type SolicitudServicioCreate = JsonBody & {
  descripcion: string
  turnstileToken?: string
}

export const servicioService = {
  subirFoto: (formData: FormData) =>
    api.post('/servicios/fotos', formData, { headers: { 'Content-Type': undefined } }),

  crear: (data: SolicitudServicioCreate) => {
    const { turnstileToken, ...resto } = data
    return api.post('/servicios', {
      ...resto,
      ...(turnstileToken ? { turnstileToken } : {}),
    })
  },

  misSolicitudes: () => api.get('/servicios/mis-solicitudes'),

  listarTodas: () => api.get('/servicios'),

  cambiarEstado: (id: Id, estado: string, notasAdmin: string) =>
    api.put(`/servicios/${id}/estado`, { estado, notasAdmin }),

  eliminar: (id: Id) => api.delete(`/servicios/${id}`),
}
