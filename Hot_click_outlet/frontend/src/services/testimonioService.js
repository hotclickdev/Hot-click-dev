import api from './api'

export const testimonioService = {
  // Públicos
  getPublicos:             ()           => api.get('/testimonios/publicos'),
  getResenasProducto:      (productoId) => api.get(`/testimonios/producto/${productoId}/resenas`),
  getRating:               (productoId) => api.get(`/testimonios/producto/${productoId}/rating`),

  // Usuario autenticado
  getMisTestimonios:       ()           => api.get('/testimonios/mis-testimonios'),
  getProductosParaResenar: ()           => api.get('/testimonios/productos-para-resenar'),

  subirImagen: (fd) => api.post('/testimonios/imagen', fd, {
    headers: { 'Content-Type': undefined },
  }),

  // Crear — dos endpoints separados
  crearTestimonio: (data) => api.post('/testimonios/testimonio', data),
  crearResena:     (data) => api.post('/testimonios/resena', data),

  // Admin
  getAdmin:  ()    => api.get('/testimonios/admin'),
  aprobar:   (id)  => api.put(`/testimonios/${id}/aprobar`),
  rechazar:  (id)  => api.put(`/testimonios/${id}/rechazar`),
}
