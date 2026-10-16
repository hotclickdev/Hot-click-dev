import api from '@/services/api'
import type { Id } from '@/types/api'

export type CambiarPlanResultado = {
  status: 'activado' | 'requiere_pago' | 'actualizando' | 'pendiente_ciclo'
  subscriptionId?: string
  customerId?: string
  publishableKey?: string
  planNombre?: string
  mensaje?: string
  mock?: boolean
}

export const billingService = {
  getPlanes: () => api.get('/billing/planes'),
  getSuscripcion: () => api.get('/billing/suscripcion'),
  getFacturas: (pagina = 0) => api.get(`/billing/facturas?pagina=${pagina}`),
  iniciarTrial: () => api.post('/billing/trial'),
  crearCheckout: (planId: Id) => api.post(`/billing/checkout/${planId}`),
  cambiarPlan: (planId: Id) => api.post<CambiarPlanResultado>(`/billing/cambiar-plan/${planId}`),
  crearPortal: () => api.post('/billing/portal'),
  cancelar: (inmediata = false) => api.post(`/billing/cancelar?inmediata=${inmediata}`),
}
