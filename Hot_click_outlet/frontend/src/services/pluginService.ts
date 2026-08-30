import api from './api'
import type { Id, JsonBody } from '@/types/api'

/** Marketplace de plugins / webhooks (admin). */
export const pluginService = {
  list: () => api.get('/admin/plugins'),
  getEventos: (id: Id) => api.get(`/admin/plugins/${id}/eventos`),
  create: (form: JsonBody) => api.post('/admin/plugins', form),
  update: (id: Id, form: JsonBody) => api.put(`/admin/plugins/${id}`, form),
  remove: (id: Id) => api.delete(`/admin/plugins/${id}`),
  test: (id: Id) => api.post(`/admin/plugins/${id}/test`),
}
