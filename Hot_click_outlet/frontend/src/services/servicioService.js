import api from './api'

export const servicioService = {
  subirFoto: (formData) =>
    api.post('/servicios/fotos', formData, { headers: { 'Content-Type': undefined } }),

  crear: (data) => api.post('/servicios', data),

  misSolicitudes: () => api.get('/servicios/mis-solicitudes'),

  listarTodas: () => api.get('/servicios'),

  cambiarEstado: (id, estado, notasAdmin) =>
    api.put(`/servicios/${id}/estado`, { estado, notasAdmin }),

  eliminar: (id) => api.delete(`/servicios/${id}`),
}
