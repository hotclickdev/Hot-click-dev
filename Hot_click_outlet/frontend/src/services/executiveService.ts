import api from './api'
import type { JsonBody } from '@/types/api'

/** Dashboard ejecutivo (admin). */
export const executiveService = {
  getDashboard: () => api.get('/admin/executive/dashboard'),
  guardarResumen: (body: JsonBody) => api.post('/admin/executive/guardar-resumen', body),
}
