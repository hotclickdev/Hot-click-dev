import api from './api'

/** Dashboard ejecutivo (admin). */
export const executiveService = {
  getDashboard: () => api.get('/admin/executive/dashboard'),
  guardarResumen: (body) => api.post('/admin/executive/guardar-resumen', body),
}
