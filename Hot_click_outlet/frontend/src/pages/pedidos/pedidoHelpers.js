import { formatDateShort, formatPrice } from '@/utils/format'

export const ESTADOS_SIN_ACCION = new Set(['CANCELADO', 'PENDIENTE'])
export const DIAS_GARANTIA = 40
export const MS_POR_DIA = 86_400_000

export const ESTADO_LABELS = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pago confirmado',
  EN_PREPARACION: 'En preparación',
  LISTO_RETIRO: 'Listo p/ retirar',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

/** @param {string} estado */
export function colorEstadoPedido(estado) {
  if (estado === 'ENTREGADO') return { bg: 'rgba(5,150,105,0.12)', text: '#059669', border: 'rgba(5,150,105,0.25)' }
  if (estado === 'ENVIADO') return { bg: 'rgba(23,71,168,0.1)', text: 'var(--hc-accent)', border: 'rgba(23,71,168,0.25)' }
  if (estado === 'LISTO_RETIRO') return { bg: 'rgba(5,150,105,0.1)', text: '#059669', border: 'rgba(5,150,105,0.25)' }
  if (estado === 'EN_PREPARACION') return { bg: 'rgba(217,119,6,0.1)', text: '#d97706', border: 'rgba(217,119,6,0.25)' }
  if (estado === 'PAGADO') return { bg: 'rgba(23,71,168,0.08)', text: 'var(--hc-accent)', border: 'rgba(23,71,168,0.2)' }
  if (estado === 'CANCELADO') return { bg: 'rgba(220,38,38,0.08)', text: '#dc2626', border: 'rgba(220,38,38,0.2)' }
  return { bg: 'var(--hc-surface-2)', text: 'var(--hc-muted)', border: 'var(--hc-border)' }
}

export function estadoDePedido(order) {
  return order.estadoPedido ?? order.estado ?? 'PENDIENTE'
}

export function totalDePedido(order) {
  return order.totalPedido ?? order.total
}

export function itemsDePedido(order) {
  return order.items ?? []
}

export function notificacionesDePedido(order) {
  return Array.isArray(order.notificaciones) ? order.notificaciones : []
}

/** @param {unknown} data */
export function pedidosDesdeRespuesta(data) {
  const payload = data?.data ?? data
  if (payload?.content) {
    return { pedidos: payload.content, totalPages: payload.totalPages ?? 1 }
  }
  return { pedidos: Array.isArray(payload) ? payload : [], totalPages: 1 }
}

export { formatDateShort, formatPrice }
