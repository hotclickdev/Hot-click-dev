import api from './api'

export const paymentService = {
  /**
   * Crea un pedido PENDIENTE y una sesión de pago.
   * @param {{ items, metodoEnvio, bodegaId, notas, provider }} payload
   * @returns {{ pedidoId, numeroPedido, redirectUrl, estadoPago, total, proveedor }}
   */
  checkout(payload) {
    return api.post('/payments/checkout', payload)
  },

  /**
   * Consulta el estado del pago de un pedido.
   * @param {string} numeroPedido
   */
  consultarEstado(numeroPedido) {
    return api.get(`/payments/status/${numeroPedido}`)
  },

  /**
   * Captura un pago PayPal tras el redirect de aprobación.
   * @param {string} paypalOrderId  El token devuelto por PayPal en la URL de retorno.
   * @param {string} numeroPedido   El número de pedido de HotClick.
   */
  capturarPayPal(paypalOrderId, numeroPedido) {
    return api.post('/payments/paypal/capture', null, {
      params: { paypalOrderId, numeroPedido },
    })
  },

  /**
   * Cancela un pedido PENDIENTE y libera el stock reservado.
   * Llamar cuando el usuario regresa de la URL de cancelación del proveedor.
   * @param {string} numeroPedido
   */
  cancelarPedido(numeroPedido) {
    return api.post(`/payments/cancel/${numeroPedido}`)
  },

  // ── Invitados (sin autenticación) ────────────────────────────────────

  /** Checkout sin cuenta — guestEmail requerido en payload. */
  guestCheckout(payload) {
    return api.post('/payments/guest-checkout', payload)
  },

  /** Captura PayPal para compra de invitado. */
  guestCapturarPayPal(paypalOrderId, numeroPedido) {
    return api.post('/payments/guest/paypal/capture', null, {
      params: { paypalOrderId, numeroPedido },
    })
  },

  /** Cancela pedido de invitado y libera stock. */
  guestCancelarPedido(numeroPedido) {
    return api.post(`/payments/guest/cancel/${numeroPedido}`)
  },

  // ── Admin SINPE ──────────────────────────────────────────────────────────

  /** Confirma un pago SINPE tras verificar el comprobante (solo admin). */
  confirmarSinpe(pagoId) {
    return api.post(`/admin/pagos/${pagoId}/confirmar-sinpe`)
  },

  /** Rechaza un pago SINPE (solo admin). */
  rechazarSinpe(pagoId, motivo) {
    return api.post(`/admin/pagos/${pagoId}/rechazar-sinpe`, null,
      motivo ? { params: { motivo } } : undefined)
  },
}
