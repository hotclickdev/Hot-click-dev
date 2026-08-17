import api from './api'

/** Feature flags por empresa (admin). */
export const flagService = {
  list: () => api.get('/admin/flags'),
  getByEmpresa: (empresaId) => api.get(`/admin/flags/${empresaId}`),
  set: (empresaId, flagNombre, on) =>
    api.post(`/admin/flags/${empresaId}/${flagNombre}/${on ? 'on' : 'off'}`),
}
