import type { Id, JsonBody } from './api'

export type EstadoPedido = string

export type PedidoCreate = JsonBody

export type LineaPedido = {
  productoId: Id
  cantidad: number
}

export type PedidoTiendaInvitado = {
  nombreCliente?: string
  correoCliente?: string
  telefonoCliente?: string
  direccionEntrega?: string
  metodoPago?: string
  metodoEnvio?: string
  notas?: string
  items: LineaPedido[]
}

export type CheckoutPayload = {
  items?: unknown[]
  metodoEnvio?: string
  bodegaId?: Id | null
  notas?: string | null
  provider?: string
  guestEmail?: string
  /** Token del QR del POS — al pagar, marca la sesión del cajero como PAGADO. */
  posQrToken?: string
  [key: string]: unknown
}

/** Línea de pedido en respuestas admin / detalle. */
export type ItemPedido = {
  productoId?: Id
  nombreProducto?: string
  nombre?: string
  imagenUrl?: string | null
  categoriaId?: Id | null
  categoriaNombre?: string
  cantidad?: number | string
  precioUnitario?: number | string
  precio?: number | string
}

/** Pedido tal como llega al panel admin y al listado. */
export type Pedido = {
  id?: Id
  numeroPedido?: string
  fechaCreacion?: string
  fechaPedido?: string
  estado?: EstadoPedido
  estadoPedido?: EstadoPedido
  total?: number
  totalPedido?: number
  subtotal?: number
  metodoPago?: string
  metodoEnvio?: string
  origen?: string
  costoEnvio?: number | null
  numeroGuia?: string | null
  notas?: string | null
  nombreCliente?: string
  clienteCorreo?: string
  clienteTel?: string
  clienteId?: Id | null
  tipoEntrega?: string
  items?: ItemPedido[]
  notificaciones?: unknown[]
}
