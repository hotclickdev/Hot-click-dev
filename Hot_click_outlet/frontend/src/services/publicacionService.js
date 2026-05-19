import api from './api'

export const publicacionService = {
  analizar: (formData) =>
    api.post('/extraccion/analizar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000,
    }),

  detallesProducto: (formData) =>
    api.post('/extraccion/detalles-producto', formData, {
      headers: { 'Content-Type': undefined },
      timeout: 90000,
    }),

  getTipoCambio: () =>
    api.get('/extraccion/tipo-cambio'),

  buscarPorNombre: (nombre, productoId) =>
    api.post('/extraccion/buscar', { nombre, productoId: productoId || null }),

  listar: (estado) =>
    api.get('/publicaciones-fb', { params: estado ? { estado } : {} }),

  generar: (productoId, notasAdmin) =>
    api.post(`/publicaciones-fb/${productoId}`, notasAdmin ? { notasAdmin } : {}),

  marcarPublicado: (id) =>
    api.put(`/publicaciones-fb/${id}/publicado`),

  eliminar: (id) =>
    api.delete(`/publicaciones-fb/${id}`),
}
