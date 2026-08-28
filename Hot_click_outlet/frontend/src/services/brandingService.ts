import api from './api'
import type { JsonBody } from '@/types/api'

/** Branding / white-label de la tienda (colores, tipografía, copy). */
export const brandingService = {
  get: () => api.get('/admin/branding'),
  update: (data: JsonBody) => api.put('/admin/branding', data),
}
