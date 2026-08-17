import api from './api'

/** Métricas de observabilidad (admin). */
export const observabilidadService = {
  getDashboard: () => api.get('/admin/observabilidad'),
}
