import api from './api'
import type { Id } from '@/types/api'
import type { CheckoutPayload } from '@/types/pedido'

export const paymentService = {
  /**
   * Crea un pedido PENDIENTE y una sesión de pago.
   * @param {{ items, metodoEnvio, bodegaId, notas, provider }} payload
   * @returns {{ pedidoId, numeroPedido, redirectUrl, estadoPago, total, proveedor }}
   */
  checkout(payload: CheckoutPayload) {
    return api.post('/payments/checkout', payload)
  },

  /**
   * Consulta el estado del pago de un pedido.
   * @param {string} numeroPedido
   */
  /** Solo el dueño (sesión) o el invitado con el token firmado del pedido (guardado al pagar). */
  consultarEstado(numeroPedido: string) {
    const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`hc-cancel-token:${numeroPedido}`) : null
    return api.get(`/payments/status/${encodeURIComponent(numeroPedido)}`, token ? { params: { token } } : undefined)
  },

  /**
   * Cancela un pedido PENDIENTE y libera el stock reservado.
   * Llamar cuando el usuario regresa de la URL de cancelación del proveedor.
   * @param {string} numeroPedido
   */
  cancelarPedido(numeroPedido: string) {
    return api.post(`/payments/cancel/${numeroPedido}`)
  },

  // ── Invitados (sin autenticación) ────────────────────────────────────

  /** Checkout sin cuenta — guestEmail requerido en payload. */
  guestCheckout(payload: CheckoutPayload) {
    return api.post('/payments/guest-checkout', payload)
  },

  /** Público: si la pasarela Tilopay tiene credenciales. */
  disponibilidad() {
    return api.get<{ tilopay: boolean }>('/payments/disponibilidad')
  },

  /** Cancela pedido de invitado y libera stock. Requiere cancelToken del checkout. */
  guestCancelarPedido(numeroPedido: string, cancelToken?: string | null) {
    const token = cancelToken
      ?? (typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(`hc-cancel-token:${numeroPedido}`)
        : null)
    return api.post(`/payments/guest/cancel/${numeroPedido}`, { cancelToken: token })
  },

  // ── Admin SINPE (legacy, por pagoId) ─────────────────────────────────────

  /** Confirma un pago SINPE tras verificar el comprobante (solo admin). */
  confirmarSinpe(pagoId: Id) {
    return api.post(`/admin/pagos/${pagoId}/confirmar-sinpe`)
  },

  /** Rechaza un pago SINPE (solo admin). */
  rechazarSinpe(pagoId: Id, motivo?: string) {
    return api.post(`/admin/pagos/${pagoId}/rechazar-sinpe`, { motivo: motivo || null })
  },

  // ── Checkout manual (efectivo) ───────────────────────────────────────────

  /** Checkout manual autenticado (hoy solo efectivo; SINPE Móvil y Tarjeta van por Tilopay). */
  sinpeCheckout(payload: CheckoutPayload) {
    return api.post('/sinpe/checkout', payload)
  },

  /** Checkout manual para invitados (hoy solo efectivo). */
  guestSinpeCheckout(payload: CheckoutPayload) {
    return api.post('/sinpe/guest-checkout', payload)
  },

  // ── Admin SINPE — comprobantes (nuevo flujo) ──────────────────────────────

  /** Lista comprobantes SINPE para revisión admin. */
  listarComprobantes(estado: string = '', page: number = 0) {
    const params = new URLSearchParams({ page: String(page), size: String(20) })
    if (estado) params.set('estado', estado)
    return api.get(`/sinpe/admin/comprobantes?${params}`)
  },

  /** Aprueba un comprobante SINPE (por id de comprobante). */
  aprobarComprobante(comprobanteId: Id) {
    return api.post(`/sinpe/admin/comprobantes/${comprobanteId}/aprobar`)
  },

  /** Rechaza un comprobante SINPE con motivo opcional. */
  rechazarComprobante(comprobanteId: Id, motivo?: string) {
    return api.post(`/sinpe/admin/comprobantes/${comprobanteId}/rechazar`, { motivo: motivo || null })
  },

  kpisAdmin() {
    return api.get('/admin/pagos/kpis')
  },

  listarAdmin(queryString: string) {
    return api.get(`/admin/pagos?${queryString}`)
  },

  listarWebhooks(queryString: string) {
    return api.get(`/admin/webhooks?${queryString}`)
  },

  // ── Tilopay ──────────────────────────────────────────────────────────────

  /**
   * Confirma el retorno de Tilopay (query params del redirect SDK).
   * @param numeroPedido número de pedido HotClick
   * @param queryParams code, order, description, etc.
   */
  confirmarTilopay(numeroPedido: string, queryParams: Record<string, string> = {}) {
    return api.post(`/payments/tilopay/confirmar/${encodeURIComponent(numeroPedido)}`, queryParams)
  },

  /** Solicita un nuevo sdkToken para reintentar un pago Tilopay. */
  reintentarTilopay(numeroPedido: string) {
    return api.post(`/payments/tilopay/reintentar/${encodeURIComponent(numeroPedido)}`)
  },

  /** Comisión de pasarela (admin) — opcional; el UI tolera 404. */
  getConfigComision() {
    return api.get('/admin/configuracion/comision')
  },

  putConfigComision(body: {
    pctComisionTarjeta?: number
    montoFijoComisionCrc?: number
    pctDescuentoSinpe?: number
  }) {
    return api.put('/admin/configuracion/comision', body)
  },
}
