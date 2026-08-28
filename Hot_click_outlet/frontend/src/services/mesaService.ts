import api from './api'
import type { Id, JsonBody } from '@/types/api'

/** Mesas / QR de autoservicio. */
export const mesaService = {
  getAll: () => api.get('/admin/mesas'),
  create: (data: JsonBody) => api.post('/admin/mesas', data),
  update: (id: Id, data: JsonBody) => api.put(`/admin/mesas/${id}`, data),
  regenerarToken: (id: Id) => api.post(`/admin/mesas/${id}/regenerar-token`),
}
