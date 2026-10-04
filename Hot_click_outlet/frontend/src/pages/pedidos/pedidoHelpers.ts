import { formatDateShort, formatPrice } from '@/utils/format'

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

export type ItemPedidoCliente = {
  cantidad?: number
  nombreProducto?: string
  producto?: { id?: number; nombreProducto?: string; imagenPrincipalUrl?: string | null; empresaNombre?: string | null }
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
  /**
   * Agrupa subpedidos de un mismo checkout multivendedor (uno por bodega de
   * origen, un único pago). Viene de `Pedido.grupoPago` en el backend —
   * campo aditivo, hoy no lo llena ningún endpoint fusionado en esta rama.
   * Con un solo pedido por grupo (o sin valor) el comportamiento no cambia.
   */
  grupoPago?: string | null
  compraId?: number | null
  numeroCompra?: string | null
  numeroPaquete?: number | null
  cantidadPaquetes?: number | null
  nombreNegocio?: string | null
  /** Nombre de la tienda/vendedor dueño de este paquete, si el backend lo manda. */
  nombreEmpresa?: string
  subtotal?: number
  metodoPago?: string
  fechaEnvio?: string | null
  fechaEntregaEstimada?: string | null
  fechaEntregaReal?: string | null
  /** Bodega de origen del paquete (el backend la serializa; `provincia` alimenta "Sale de …"). */
  bodega?: { id?: number; nombreBodega?: string; provincia?: string | null } | null
}

/** Un grupo de pedidos que comparten `grupoPago` (checkout multivendedor). */
export type GrupoDePedidos = {
  grupoPago: string | null
  pedidos: PedidoCliente[]
}

/**
 * Agrupa pedidos por `grupoPago` preservando el orden de llegada. Pedidos sin
 * `grupoPago`, o que son el único representante de su grupo, quedan como
 * grupos de un solo pedido — la UI los renderiza igual que hoy.
 */
export function agruparPedidosPorPaquete(pedidos: PedidoCliente[]): GrupoDePedidos[] {
  const grupos: GrupoDePedidos[] = []
  const indicePorClave = new Map<string, number>()

  for (const pedido of pedidos) {
    const clave = pedido.grupoPago
    if (!clave) {
      grupos.push({ grupoPago: null, pedidos: [pedido] })
      continue
    }
    const idx = indicePorClave.get(clave)
    if (idx === undefined) {
      indicePorClave.set(clave, grupos.length)
      grupos.push({ grupoPago: clave, pedidos: [pedido] })
    } else {
      grupos[idx].pedidos.push(pedido)
    }
  }

  return grupos
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

export function pedidoDesdeRespuesta(data: unknown): PedidoCliente | null {
  const lista = pedidosDesdeRespuesta(data)
  if (lista.pedidos.length > 0) return lista.pedidos[0]
  const envelope = data && typeof data === 'object' && 'data' in data
    ? (data as { data: unknown }).data
    : data
  if (!esPedidoCliente(envelope) || Array.isArray(envelope) || 'content' in envelope) return null
  return envelope
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
