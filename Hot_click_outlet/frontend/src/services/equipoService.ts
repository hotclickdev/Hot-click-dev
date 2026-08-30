import api from './api'
import type { Id, JsonBody } from '@/types/api'

export const equipoService = {
  getAll: () => api.get('/empresa/equipo'),
  invitar: (data: JsonBody) => api.post('/empresa/equipo', data),
  cambiarRol: (id: Id, rolEnEmpresa: string) => api.put(`/empresa/equipo/${id}/rol`, { rolEnEmpresa }),
  eliminar: (id: Id) => api.delete(`/empresa/equipo/${id}`),
}
