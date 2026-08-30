import api from './api'
import type { Id } from '@/types/api'

/** Feature flags por empresa (admin). */
export const flagService = {
  list: () => api.get('/admin/flags'),
  getByEmpresa: (empresaId: Id) => api.get(`/admin/flags/${empresaId}`),
  set: (empresaId: Id, flagNombre: string, on: boolean) =>
    api.post(`/admin/flags/${empresaId}/${flagNombre}/${on ? 'on' : 'off'}`),
}
