import { formatDateShort, formatPrice } from '@/utils/format'

export const ESTADOS_SIN_ACCION = new Set(['CANCELADO', 'PENDIENTE'])
export const DIAS_GARANTIA = 40
export const MS_POR_DIA = 86_400_000

export const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pago confirmado',
  EN_PREPARACION: 'En preparación',
  LISTO_RETIRO: 'Listo p/ retirar',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

export type ColorEstadoPedido = {
  bg: string
  text: string
  border: string
}

export type ItemPedidoCliente = {
  cantidad?: number
  nombreProducto?: string
  producto?: { id?: number; nombreProducto?: string }
  productoId?: number
  precioUnitarioMomento?: number
  subtotalItem?: number
}

export type NotificacionPedido = {
  estado?: string
  fecha?: string
  nota?: string
}

export type PedidoCliente = {
  id?: number
  numeroPedido?: string
  fechaPedido?: string
  estadoPedido?: string
  estado?: string
  totalPedido?: number
  total?: number
  items?: ItemPedidoCliente[]
  notificaciones?: NotificacionPedido[]
  metodoEnvio?: string
  costoEnvio?: number
  notas?: string
  numeroGuia?: string
  urlTracking?: string
}

export function colorEstadoPedido(estado: string): ColorEstadoPedido {
  if (estado === 'ENTREGADO') return { bg: 'rgba(5,150,105,0.12)', text: '#059669', border: 'rgba(5,150,105,0.25)' }
  if (estado === 'ENVIADO') return { bg: 'rgba(23,71,168,0.1)', text: 'var(--hc-accent)', border: 'rgba(23,71,168,0.25)' }
  if (estado === 'LISTO_RETIRO') return { bg: 'rgba(5,150,105,0.1)', text: '#059669', border: 'rgba(5,150,105,0.25)' }
  if (estado === 'EN_PREPARACION') return { bg: 'rgba(217,119,6,0.1)', text: '#d97706', border: 'rgba(217,119,6,0.25)' }
  if (estado === 'PAGADO') return { bg: 'rgba(23,71,168,0.08)', text: 'var(--hc-accent)', border: 'rgba(23,71,168,0.2)' }
  if (estado === 'CANCELADO') return { bg: 'rgba(220,38,38,0.08)', text: '#dc2626', border: 'rgba(220,38,38,0.2)' }
  return { bg: 'var(--hc-surface-2)', text: 'var(--hc-muted)', border: 'var(--hc-border)' }
}

export function estadoDePedido(order: PedidoCliente): string {
  return order.estadoPedido ?? order.estado ?? 'PENDIENTE'
}

export function totalDePedido(order: PedidoCliente): number | undefined {
  return order.totalPedido ?? order.total
}

export function itemsDePedido(order: PedidoCliente): ItemPedidoCliente[] {
  return order.items ?? []
}

export function notificacionesDePedido(order: PedidoCliente): NotificacionPedido[] {
  return Array.isArray(order.notificaciones) ? order.notificaciones : []
}

function esPedidoCliente(value: unknown): value is PedidoCliente {
  return typeof value === 'object' && value !== null
}

export function pedidosDesdeRespuesta(data: unknown): { pedidos: PedidoCliente[]; totalPages: number } {
  const envelope = data && typeof data === 'object' && 'data' in data
    ? (data as { data: unknown }).data
    : data
  if (envelope && typeof envelope === 'object' && 'content' in envelope) {
    const pagina = envelope as { content: unknown; totalPages?: number }
    const content = Array.isArray(pagina.content) ? pagina.content.filter(esPedidoCliente) : []
    return { pedidos: content, totalPages: pagina.totalPages ?? 1 }
  }
  return { pedidos: Array.isArray(envelope) ? envelope.filter(esPedidoCliente) : [], totalPages: 1 }
}

export { formatDateShort, formatPrice }
