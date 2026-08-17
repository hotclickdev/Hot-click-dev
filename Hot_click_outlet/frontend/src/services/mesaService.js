import api from './api'

/** Mesas / QR de autoservicio. */
export const mesaService = {
  getAll: () => api.get('/admin/mesas'),
  create: (data) => api.post('/admin/mesas', data),
  update: (id, data) => api.put(`/admin/mesas/${id}`, data),
  regenerarToken: (id) => api.post(`/admin/mesas/${id}/regenerar-token`),
}
