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
  /** Tilopay (reemplaza ONVO): datos para abrir el SDK embebido. */
  proveedor?: 'TILOPAY' | 'ONVO'
  orderNumber?: string
  montoCrc?: number
  sdkToken?: string
}

/** GET /billing/trial/tarjeta: solo el propietario; el negocio sale del JWT. */
export type TrialTarjetaEstado = { elegible: boolean; tarjetaGuardada: boolean; trialDias: number }

/** POST /billing/trial/tarjeta: datos para abrir el SDK de ONVO sobre la suscripción del trial (no cobra nada). */
export type TrialTarjetaInicio = {
  status: 'requiere_tarjeta' | 'tarjeta_guardada' | 'mock'
  subscriptionId?: string
  customerId?: string
  publishableKey?: string
  planNombre?: string
  trialDias?: number
  mock?: boolean
}

export type ConfirmarCobroPlan = { estado: 'ACTIVO' | 'NO_CONFIRMADO' }

export const billingService = {
  getPlanes: () => api.get('/billing/planes'),
  getSuscripcion: () => api.get('/billing/suscripcion'),
  getFacturas: (pagina = 0) => api.get(`/billing/facturas?pagina=${pagina}`),
  iniciarTrial: () => api.post('/billing/trial'),
  crearCheckout: (planId: Id) => api.post(`/billing/checkout/${planId}`),
  getImpago: () => api.get<import('@/features/suspension/suspensionImpaga').EstadoImpago>('/billing/impago'),
  pedidosImpago: () => api.get<import('@/features/suspension/suspensionImpaga').PedidoDeGracia[]>('/billing/impago/pedidos'),
  pagarImpago: () => api.post<CambiarPlanResultado>('/billing/impago/pagar'),
  cambiarPlan: (planId: Id) => api.post<CambiarPlanResultado>(`/billing/cambiar-plan/${planId}`),
  getTrialTarjeta: () => api.get<TrialTarjetaEstado>('/billing/trial/tarjeta'),
  iniciarTrialTarjeta: () => api.post<TrialTarjetaInicio>('/billing/trial/tarjeta'),
  crearPortal: () => api.post('/billing/portal'),
  cancelar: (inmediata = false) => api.post(`/billing/cancelar?inmediata=${inmediata}`),
  confirmarCobroTilopay: (orderNumber: string) =>
    api.post<ConfirmarCobroPlan>(`/billing/tilopay/confirmar/${encodeURIComponent(orderNumber)}`),
}
