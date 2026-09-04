import api from './api'

/** Métricas de observabilidad (admin). */
export const observabilidadService = {
  getDashboard: () => api.get('/admin/observabilidad'),
  getUsoTenants: (params?: { anio?: number; mes?: number }) =>
    api.get('/admin/observabilidad/uso-tenants', { params }),
  getUsoTenant: (empresaId: number | string, params?: { anio?: number; mes?: number }) =>
    api.get(`/admin/observabilidad/uso-tenants/${empresaId}`, { params }),
}
