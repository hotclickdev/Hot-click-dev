import api from './api'

export const adminBillingService = {
  listar: () => api.get('/admin/billing/empresas'),
  detalle: (empresaId: number) => api.get(`/admin/billing/empresas/${empresaId}`),
}
