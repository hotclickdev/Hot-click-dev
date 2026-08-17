import api from './api'

/** Branding / white-label de la tienda (colores, tipografía, copy). */
export const brandingService = {
  get: () => api.get('/admin/branding'),
  update: (data) => api.put('/admin/branding', data),
}
