import api from './api'
import type { Id, JsonBody } from '@/types/api'

export const marcaService = {
  /** Sin auth — usado por catálogo/búsqueda */
  getPublicas: () =>
    api.get('/marcas/publicas'),

  getAll: () =>
    api.get('/marcas'),

  create: (data: JsonBody) =>
    api.post('/marcas', data),

  update: (id: Id, data: JsonBody) =>
    api.put(`/marcas/${id}`, data),

  delete: (id: Id) =>
    api.delete(`/marcas/${id}`),

  importBulk: (items: JsonBody[]) =>
    api.post('/marcas/bulk', items),

  uploadLogo: (formData: FormData) =>
    api.post('/marcas/logo', formData, { headers: { 'Content-Type': undefined } }),
}
