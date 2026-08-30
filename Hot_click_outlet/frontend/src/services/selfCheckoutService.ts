import api from './api'
import type { JsonBody } from '@/types/api'

/** Self-checkout por QR de mesa (público). */
export const selfCheckoutService = {
  getMesa: (token: string) => api.get(`/qr/${token}`),
  getProductos: (token: string) => api.get(`/qr/${token}/productos`),
  crearPedido: (token: string, body: JsonBody) => api.post(`/qr/${token}/pedido`, body),
}
