import api from './api'

/** Blog: listado público y CRUD admin. */
export const blogService = {
  getPublicos: () => api.get('/blog/publico'),
  getPublico: (slug) => api.get(`/blog/publico/${slug}`),
  getAll: () => api.get('/blog'),
  create: (data) => api.post('/blog', data),
  update: (id, data) => api.put(`/blog/${id}`, data),
  delete: (id) => api.delete(`/blog/${id}`),
}
