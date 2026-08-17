import api from './api'

/** Self-checkout por QR de mesa (público). */
export const selfCheckoutService = {
  getMesa: (token) => api.get(`/qr/${token}`),
  getProductos: (token) => api.get(`/qr/${token}/productos`),
  crearPedido: (token, body) => api.post(`/qr/${token}/pedido`, body),
}
