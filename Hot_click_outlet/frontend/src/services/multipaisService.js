import api from './api'

/** Configuración multi-país (admin). */
export const multipaisService = {
  getConfig: () => api.get('/admin/multipais/config'),
  getPaises: () => api.get('/admin/multipais/paises'),
  getTasas: () => api.get('/admin/multipais/tasas'),
  updateConfig: (form) => api.put('/admin/multipais/config', form),
}
