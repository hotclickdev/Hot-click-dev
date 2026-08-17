import api from './api'

/** Convenios: listado público (sin auth) y CRUD admin. */
export const convenioService = {
  getPublicos: () => api.get('/convenios/publicos'),
  getAll: () => api.get('/convenios'),
  create: (data) => api.post('/convenios', data),
  update: (id, data) => api.put(`/convenios/${id}`, data),
  delete: (id) => api.delete(`/convenios/${id}`),
}
