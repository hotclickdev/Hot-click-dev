import api from './api'
import type { Id, JsonBody } from '@/types/api'

export const servicioService = {
  subirFoto: (formData: FormData) =>
    api.post('/servicios/fotos', formData, { headers: { 'Content-Type': undefined } }),

  crear: (data: JsonBody) => api.post('/servicios', data),

  misSolicitudes: () => api.get('/servicios/mis-solicitudes'),

  listarTodas: () => api.get('/servicios'),

  cambiarEstado: (id: Id, estado: string, notasAdmin: string) =>
    api.put(`/servicios/${id}/estado`, { estado, notasAdmin }),

  eliminar: (id: Id) => api.delete(`/servicios/${id}`),
}
