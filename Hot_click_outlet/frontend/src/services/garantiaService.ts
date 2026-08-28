import api from './api'
import type { Id, JsonBody } from '@/types/api'

export const garantiaService = {
  misGarantias: () => api.get('/garantias/mis-garantias'),

  crearSolicitud: (data: JsonBody) => api.post('/garantias/solicitudes', data),

  misSolicitudes: () => api.get('/garantias/solicitudes/mis-solicitudes'),

  // Admin
  listarTodas: () => api.get('/garantias/solicitudes'),

  cambiarEstado: (id: Id, estado: string, notasAdmin: string) =>
    api.put(`/garantias/solicitudes/${id}/estado`, { estado, notasAdmin }),
}
