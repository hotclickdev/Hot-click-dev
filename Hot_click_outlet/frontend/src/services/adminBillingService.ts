import api from './api'

export const adminBillingService = {
  listar: (page = 0, size = 100) => api.get('/admin/billing/empresas', { params: { page, size } }),
  detalle: (empresaId: number) => api.get(`/admin/billing/empresas/${empresaId}`),
}
