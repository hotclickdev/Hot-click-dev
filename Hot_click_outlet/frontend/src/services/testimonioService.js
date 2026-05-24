import api from './api'

export const testimonioService = {
  getPublicos: ()        => api.get('/testimonios/publicos'),
  getAdmin:    ()        => api.get('/testimonios/admin'),
  subirImagen: (fd)      => api.post('/testimonios/imagen', fd),
  crear:       (data)    => api.post('/testimonios', data),
  aprobar:     (id)      => api.put(`/testimonios/${id}/aprobar`),
  rechazar:    (id)      => api.put(`/testimonios/${id}/rechazar`),
}
