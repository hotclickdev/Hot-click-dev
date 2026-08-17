import api from './api'

export const equipoService = {
  getAll: () => api.get('/empresa/equipo'),
  invitar: (data) => api.post('/empresa/equipo', data),
  cambiarRol: (id, rolEnEmpresa) => api.put(`/empresa/equipo/${id}/rol`, { rolEnEmpresa }),
  eliminar: (id) => api.delete(`/empresa/equipo/${id}`),
}
