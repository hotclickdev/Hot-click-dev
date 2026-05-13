import api from './api'

export const publicacionService = {
  analizar: (formData) =>
    api.post('/extraccion/analizar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getTipoCambio: () =>
    api.get('/extraccion/tipo-cambio'),

  listar: (estado) =>
    api.get('/publicaciones-fb', { params: estado ? { estado } : {} }),

  generar: (productoId, notasAdmin) =>
    api.post(`/publicaciones-fb/${productoId}`, notasAdmin ? { notasAdmin } : {}),

  marcarPublicado: (id) =>
    api.put(`/publicaciones-fb/${id}/publicado`),

  eliminar: (id) =>
    api.delete(`/publicaciones-fb/${id}`),
}
