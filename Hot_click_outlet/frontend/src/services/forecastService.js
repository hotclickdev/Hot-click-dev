import api from './api'

/** Pronóstico de demanda (admin). */
export const forecastService = {
  getDashboard: () => api.get('/admin/forecast/dashboard'),
  generar: () => api.post('/admin/forecast/generar'),
}
