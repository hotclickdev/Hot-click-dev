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

  uploadLogo: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/marcas/logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (data, headers) => {
        delete headers['Content-Type']
        return data
      },
    })
  },
}
