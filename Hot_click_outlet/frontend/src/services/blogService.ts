import api from './api'
import type { Id, JsonBody } from '@/types/api'

/** Blog: listado público y CRUD admin. */
export const blogService = {
  getPublicos: () => api.get('/blog/publico'),
  getPublico: (slug: string) => api.get(`/blog/publico/${slug}`),
  getAll: () => api.get('/blog'),
  create: (data: JsonBody) => api.post('/blog', data),
  update: (id: Id, data: JsonBody) => api.put(`/blog/${id}`, data),
  delete: (id: Id) => api.delete(`/blog/${id}`),
}
