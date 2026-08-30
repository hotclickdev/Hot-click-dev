import api from './api'
import type { Id, JsonBody } from '@/types/api'

export const testimonioService = {
  // Públicos
  getPublicos:             ()           => api.get('/testimonios/publicos'),
  getResenasProducto:      (productoId: Id) => api.get(`/testimonios/producto/${productoId}/resenas`),
  getRating:               (productoId: Id) => api.get(`/testimonios/producto/${productoId}/rating`),

  // Usuario autenticado
  getMisTestimonios:       ()           => api.get('/testimonios/mis-testimonios'),
  getProductosParaResenar: ()           => api.get('/testimonios/productos-para-resenar'),

  subirImagen: (fd: FormData) => api.post('/testimonios/imagen', fd, {
    headers: { 'Content-Type': undefined },
  }),

  // Crear — dos endpoints separados
  crearTestimonio: (data: JsonBody) => api.post('/testimonios/testimonio', data),
  crearResena:     (data: JsonBody) => api.post('/testimonios/resena', data),

  // Admin
  getAdmin:  ()    => api.get('/testimonios/admin'),
  aprobar:   (id: Id)  => api.put(`/testimonios/${id}/aprobar`),
  rechazar:  (id: Id)  => api.put(`/testimonios/${id}/rechazar`),
}
