import api from './api'

export const marcaService = {
  /** Sin auth — usado por catálogo/búsqueda */
  getPublicas: () =>
    api.get('/marcas/publicas'),

  getAll: () =>
    api.get('/marcas'),

  create: (data) =>
    api.post('/marcas', data),

  update: (id, data) =>
    api.put(`/marcas/${id}`, data),

  delete: (id) =>
    api.delete(`/marcas/${id}`),

  importBulk: (items) =>
    api.post('/marcas/bulk', items),

  uploadLogo: (formData) =>
    api.post('/marcas/logo', formData, { headers: { 'Content-Type': undefined } }),
}
