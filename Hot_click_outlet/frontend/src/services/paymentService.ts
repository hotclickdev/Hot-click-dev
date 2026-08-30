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
  consultarEstado(numeroPedido: string) {
    return api.get(`/payments/status/${numeroPedido}`)
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

  /** Cancela pedido de invitado y libera stock. */
  guestCancelarPedido(numeroPedido: string) {
    return api.post(`/payments/guest/cancel/${numeroPedido}`)
  },

  // ── Admin SINPE (legacy, por pagoId) ─────────────────────────────────────

  /** Confirma un pago SINPE tras verificar el comprobante (solo admin). */
  confirmarSinpe(pagoId: Id) {
    return api.post(`/admin/pagos/${pagoId}/confirmar-sinpe`)
  },

  /** Rechaza un pago SINPE (solo admin). */
  rechazarSinpe(pagoId: Id, motivo?: string) {
    return api.post(`/admin/pagos/${pagoId}/rechazar-sinpe`, null,
      motivo ? { params: { motivo } } : undefined)
  },

  // ── SINPE Móvil — flujo completo ─────────────────────────────────────────

  /** Checkout SINPE autenticado → crea pedido en PENDIENTE_COMPROBANTE. */
  sinpeCheckout(payload: CheckoutPayload) {
    return api.post('/sinpe/checkout', payload)
  },

  /** Checkout SINPE para invitados. */
  guestSinpeCheckout(payload: CheckoutPayload) {
    return api.post('/sinpe/guest-checkout', payload)
  },

  /**
   * Sube el comprobante de pago SINPE (autenticado).
   * FormData fields: imagen, nombreRemitente, cedulaRemitente?, telefonoRemitente?
   */
  subirComprobanteSinpe(numeroPedido: string, formData: FormData) {
    return api.post(`/sinpe/${numeroPedido}/comprobante`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /**
   * Sube el comprobante de pago SINPE (invitado).
   * FormData fields: imagen, nombreRemitente, correoUsuario, cedulaRemitente?, telefonoRemitente?
   */
  guestSubirComprobanteSinpe(numeroPedido: string, formData: FormData) {
    return api.post(`/sinpe/guest/${numeroPedido}/comprobante`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
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
    const params = motivo ? `?motivo=${encodeURIComponent(motivo)}` : ''
    return api.post(`/sinpe/admin/comprobantes/${comprobanteId}/rechazar${params}`)
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
}
