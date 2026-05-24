import api from './api'

export const servicioService = {
  subirFoto: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/servicios/fotos', fd, { headers: { 'Content-Type': undefined } })
  },

  crear: (data) => api.post('/servicios', data),

  misSolicitudes: () => api.get('/servicios/mis-solicitudes'),

  listarTodas: () => api.get('/servicios'),

  cambiarEstado: (id, estado, notasAdmin) =>
    api.put(`/servicios/${id}/estado`, { estado, notasAdmin }),

  eliminar: (id) => api.delete(`/servicios/${id}`),
}
