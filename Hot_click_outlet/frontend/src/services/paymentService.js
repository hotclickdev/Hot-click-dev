import api from './api'

export const paymentService = {
  /**
   * Crea un pedido PENDIENTE y una sesión de pago en PayXpert.
   * @param {{ items, metodoEnvio, bodegaId, notas }} payload
   * @returns {{ pedidoId, numeroPedido, redirectUrl, estadoPago, total }}
   */
  checkout(payload) {
    return api.post('/payments/checkout', payload)
  },

  /**
   * Consulta el estado del pago de un pedido (tras regresar de PayXpert).
   * @param {string} numeroPedido
   * @returns {{ pagoId, estadoPago, numeroPedido, metodoPago, cardLast4, cardBrand, total }}
   */
  consultarEstado(numeroPedido) {
    return api.get(`/payments/status/${numeroPedido}`)
  },
}
