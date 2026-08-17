import api from './api'

/** Marketplace de plugins / webhooks (admin). */
export const pluginService = {
  list: () => api.get('/admin/plugins'),
  getEventos: (id) => api.get(`/admin/plugins/${id}/eventos`),
  create: (form) => api.post('/admin/plugins', form),
  update: (id, form) => api.put(`/admin/plugins/${id}`, form),
  remove: (id) => api.delete(`/admin/plugins/${id}`),
  test: (id) => api.post(`/admin/plugins/${id}/test`),
}
