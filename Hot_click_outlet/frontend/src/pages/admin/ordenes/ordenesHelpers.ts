import type { CSSProperties } from 'react'
import type { Id } from '@/types/api'
import type { ItemPedido, Pedido } from '@/types/pedido'
import type { ProductoBackend } from '@/types/producto'

export const FILTERS = ['Todos', 'PENDIENTE', 'PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'ENVIADO', 'ENTREGADO', 'COMPLETADO', 'CANCELADO']

export const ORD_PAGE_SIZE = 20

export type EstiloEstadoPedido = { bg: string; text: string; border: string }

export const ESTADO_STYLE: Record<string, EstiloEstadoPedido> = {
  PENDIENTE:      { bg: '#f7ead2',                text: '#8a5a00', border: 'rgba(138,90,0,0.3)' },
  PAGADO:         { bg: 'rgba(23,71,168,0.14)',   text: 'var(--hc-accent)', border: 'rgba(23,71,168,0.35)' },
  EN_PREPARACION: { bg: '#f7ead2',                text: '#8a5a00', border: 'rgba(138,90,0,0.3)' },
  LISTO_RETIRO:   { bg: '#e2f1e8',                text: '#1E7F4F', border: 'rgba(30,127,79,0.35)' },
  ENVIADO:        { bg: 'rgba(23,71,168,0.14)',   text: 'var(--hc-accent)', border: 'rgba(23,71,168,0.35)' },
  ENTREGADO:      { bg: '#e2f1e8',                text: '#1E7F4F', border: 'rgba(30,127,79,0.35)' },
  COMPLETADO:     { bg: 'rgba(23,71,168,0.14)',   text: 'var(--hc-accent)', border: 'rgba(23,71,168,0.35)' },
  CANCELADO:      { bg: 'rgba(220,38,38,0.1)',    text: '#a8291f', border: 'rgba(220,38,38,0.3)' },
}

export const ETAPAS_RETIRO = [
  { key: 'PENDIENTE',      labelKey: 'adminOrders.stepPending' },
  { key: 'PAGADO',         labelKey: 'adminOrders.stepPaid' },
  { key: 'EN_PREPARACION', labelKey: 'adminOrders.stepPrep' },
  { key: 'LISTO_RETIRO',   labelKey: 'adminOrders.stepReady' },
  { key: 'ENTREGADO',      labelKey: 'adminOrders.stepPickedUp' },
  { key: 'COMPLETADO',     labelKey: 'adminOrders.stepCompleted' },
]

export const ETAPAS_ENVIO = [
  { key: 'PENDIENTE',      labelKey: 'adminOrders.stepPending' },
  { key: 'PAGADO',         labelKey: 'adminOrders.stepPaid' },
  { key: 'EN_PREPARACION', labelKey: 'adminOrders.stepPrep' },
  { key: 'ENVIADO',        labelKey: 'adminOrders.stepShipped' },
  { key: 'ENTREGADO',      labelKey: 'adminOrders.stepDelivered' },
  { key: 'COMPLETADO',     labelKey: 'adminOrders.stepCompleted' },
]

export const METODOS_PAGO = ['SINPE', 'EFECTIVO', 'CONTRA_ENTREGA', 'TRANSFERENCIA']

export const METODOS_ENVIO = [
  { value: 'RETIRO_EN_TIENDA',   labelKey: 'adminOrders.pickupStoreLabel' },
  { value: 'ENVIO_A_DOMICILIO',  labelKey: 'adminOrders.homeDeliveryLabel' },
]

export const ESTADOS_INICIAL = ['PENDIENTE', 'PAGADO', 'EN_PREPARACION']

export const COLUMNAS_EXPORT_PEDIDOS = ['id', 'fecha', 'cliente', 'correo', 'estado', 'total', 'subtotal', 'envio', 'tipoEntrega', 'guia']

export type ItemFormPedido = {
  productoId: Id
  nombre?: string
  precio?: number | string
  cantidad: number | string
  precioUnitario: number | string
}

export type FormPedidoManual = {
  usuarioId: string | number
  metodoEnvio: string
  metodoPago: string
  costoEnvio: string
  estadoPedido: string
  notas: string
  items: ItemFormPedido[]
}

export type UsuarioCrearPedido = {
  id?: number
  nombre?: string
  correo?: string
}

export type ProductoCrearPedido = ProductoBackend & { productoId?: Id }

export const FORM_PEDIDO_INICIAL: FormPedidoManual = {
  usuarioId: '',
  metodoEnvio: 'RETIRO_EN_TIENDA',
  metodoPago: 'SINPE',
  costoEnvio: '',
  estadoPedido: 'PENDIENTE',
  notas: '',
  items: [],
}

const inpPedido: CSSProperties = { backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }

export const ESTILO_INPUT_PEDIDO = inpPedido

export function listaPedidosDesdeRespuesta(data: unknown): Pedido[] {
  const wrapped = data as { data?: unknown } | null | undefined
  const raw = wrapped?.data ?? data
  if (Array.isArray(raw)) return raw as Pedido[]
  const pagina = raw as { content?: Pedido[] } | null | undefined
  return pagina?.content ?? []
}

export function pedidosFiltradosOrdenados(orders: Pedido[], filter: string, sortDesc: boolean): Pedido[] {
  return (filter === 'Todos' ? orders : orders.filter((o) => o.estado === filter))
    .slice()
    .sort((a, b) => {
      const da = new Date(a.fechaCreacion ?? a.fechaPedido ?? 0)
      const db = new Date(b.fechaCreacion ?? b.fechaPedido ?? 0)
      return sortDesc ? db.getTime() - da.getTime() : da.getTime() - db.getTime()
    })
}

export function filasExportPedidos(orders: Pedido[]) {
  return orders.map((o) => ({
    id: o.id,
    fecha: (o.fechaCreacion ?? '').slice(0, 10),
    cliente: o.nombreCliente ?? '',
    correo: o.clienteCorreo ?? '',
    estado: o.estadoPedido ?? '',
    total: o.totalPedido ?? 0,
    subtotal: o.subtotal ?? 0,
    envio: o.costoEnvio ?? 0,
    tipoEntrega: o.tipoEntrega ?? '',
    guia: o.numeroGuia ?? '',
  }))
}

export function subtotalItemsPedido(items: ItemFormPedido[]): number {
  return items.reduce((s, i) => s + (Number.parseInt(String(i.precioUnitario)) || 0) * (Number.parseInt(String(i.cantidad)) || 0), 0)
}

export function agregarItemPedido(items: ItemFormPedido[], prod: ProductoCrearPedido): ItemFormPedido[] {
  const id = prod.id ?? prod.productoId
  const nombre = prod.nombre ?? prod.nombreProducto
  const precio = prod.precio ?? prod.precioVenta
  if (items.find((i) => i.productoId === id)) {
    return items.map((i) => i.productoId === id ? { ...i, cantidad: (i.cantidad as number) + 1 } : i)
  }
  return [...items, { productoId: id as Id, nombre, precio, cantidad: 1, precioUnitario: precio as number | string }]
}

export function payloadPedidoManual(form: FormPedidoManual, costoEnvioNum: number) {
  return {
    usuarioId: Number(form.usuarioId),
    bodegaId: 1,
    metodoEnvio: form.metodoEnvio,
    metodoPago: form.metodoPago,
    costoEnvio: costoEnvioNum,
    estadoPedido: form.estadoPedido,
    notas: form.notas || null,
    items: form.items.map((i) => ({
      productoId: i.productoId,
      cantidad: Number.parseInt(String(i.cantidad)) || 1,
      precioUnitario: Number.parseInt(String(i.precioUnitario)) || i.precio,
    })),
  }
}

export function numeroWhatsAppCliente(tel: string | number | null | undefined): string {
  const digits = String(tel).replace(/\D/g, '')
  return digits.startsWith('506') ? digits : `506${digits}`
}

export function mensajeWhatsAppPedido(order: Pedido, estado: string): string {
  const productos = (order.items ?? []).map((i: ItemPedido) => `• ${i.nombreProducto} ×${i.cantidad}`).join('\n')
  return [
    `Hola ${order.nombreCliente ?? ''}, te escribimos de *HotClick* sobre tu pedido *#${order.id}*.`,
    '',
    `Estado actual: *${order.estado ?? estado}*`,
    ...(productos ? ['\nProductos:', productos] : []),
    ...(order.numeroGuia ? [`\nGuía: *${order.numeroGuia}*`] : []),
    '',
    '¿Tenés alguna consulta? Con gusto te ayudamos.',
  ].join('\n')
}

export function mensajeErrorPedido(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('response' in err)) return undefined
  const data = (err as { response?: { data?: { message?: unknown } } }).response?.data
  const message = data && typeof data === 'object' && 'message' in data ? data.message : undefined
  return typeof message === 'string' ? message : undefined
}
