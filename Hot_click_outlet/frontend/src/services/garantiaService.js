import api from './api'

export const garantiaService = {
  misGarantias: () => api.get('/garantias/mis-garantias'),

  crearSolicitud: (data) => api.post('/garantias/solicitudes', data),

  misSolicitudes: () => api.get('/garantias/solicitudes/mis-solicitudes'),

  // Admin
  listarTodas: () => api.get('/garantias/solicitudes'),

  cambiarEstado: (id, estado, notasAdmin) =>
    api.put(`/garantias/solicitudes/${id}/estado`, { estado, notasAdmin }),
}
