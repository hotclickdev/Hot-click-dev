import api from './api'

export const testimonioService = {
  getPublicos:      ()   => api.get('/testimonios/publicos'),
  getAdmin:         ()   => api.get('/testimonios/admin'),
  getMisTestimonios:()   => api.get('/testimonios/mis-testimonios'),
  subirImagen:      (fd) => api.post('/testimonios/imagen', fd, {
    headers: { 'Content-Type': undefined },  // deja que el browser ponga el boundary multipart
  }),
  crear:    (data) => api.post('/testimonios', data),
  aprobar:  (id)   => api.put(`/testimonios/${id}/aprobar`),
  rechazar: (id)   => api.put(`/testimonios/${id}/rechazar`),
}
