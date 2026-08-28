import api from '@/services/api'
import type { Id } from '@/types/api'

export const billingService = {
  getPlanes: () => api.get('/billing/planes'),
  getSuscripcion: () => api.get('/billing/suscripcion'),
  getFacturas: (pagina = 0) => api.get(`/billing/facturas?pagina=${pagina}`),
  iniciarTrial: () => api.post('/billing/trial'),
  crearCheckout: (planId: Id) => api.post(`/billing/checkout/${planId}`),
  crearPortal: () => api.post('/billing/portal'),
  cancelar: (inmediata = false) => api.post(`/billing/cancelar?inmediata=${inmediata}`),
}
