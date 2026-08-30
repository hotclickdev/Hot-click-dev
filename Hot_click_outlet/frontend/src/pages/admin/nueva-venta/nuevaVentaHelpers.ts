import { formatPrice } from '@/utils/format'
import type { Id } from '@/types/api'
import type { Producto } from '@/types/producto'

export type TabVentaId = 'cliente' | 'rapida' | 'cotizar'
export type WaTabKey = 'formal' | 'breve' | 'urgencia' | 'personalizada'

export type ClienteVenta = {
  id?: Id
  nombre?: string
  correo?: string
  telefono?: string
}

export type ItemCarritoVenta = Producto & { cantidad: number }

export type CotizacionTemplates = {
  formal: string
  breve: string
  urgencia: string
  personalizada: string
}

export type CreatedOrderVenta = {
  estado: string
  esRetiro: boolean
  nombreCliente: string
  metodoPago: string
  items: ItemCarritoVenta[]
  subtotal: number
  costoEnvio: number
  total: number
}

export type EtapaVenta = { key: string; label: string }

/** Etapas de un pedido con retiro en local. */
export const ETAPAS_RETIRO: EtapaVenta[] = [
  { key: 'PENDIENTE',      label: 'Pendiente' },
  { key: 'PAGADO',         label: 'Pago confirmado' },
  { key: 'EN_PREPARACION', label: 'En preparación' },
  { key: 'LISTO_RETIRO',   label: 'Listo p/ retirar' },
  { key: 'ENTREGADO',      label: 'Retirado' },
  { key: 'COMPLETADO',     label: 'Completado' },
]

/** Etapas de un pedido con envío a domicilio. */
export const ETAPAS_ENVIO: EtapaVenta[] = [
  { key: 'PENDIENTE',      label: 'Pendiente' },
  { key: 'PAGADO',         label: 'Pago confirmado' },
  { key: 'EN_PREPARACION', label: 'En preparación' },
  { key: 'ENVIADO',        label: 'Enviado' },
  { key: 'ENTREGADO',      label: 'Entregado' },
  { key: 'COMPLETADO',     label: 'Completado' },
]

/** Número de WhatsApp/SINPE Móvil de HOTCLICK (sin +). */
export const WHATSAPP = '50686667888'

/** Pestañas de nueva venta (id + etiqueta). Los íconos viven en nuevaVentaIcons.tsx. */
export const TABS: { id: TabVentaId; label: string }[] = [
  { id: 'cliente', label: 'Venta con Cliente' },
  { id: 'rapida',  label: 'Venta Rápida' },
  { id: 'cotizar', label: 'Cotización WhatsApp' },
]

/** Variantes del mensaje de cotización por WhatsApp. */
export const WA_TABS: { key: WaTabKey; label: string }[] = [
  { key: 'formal',        label: 'Formal' },
  { key: 'breve',         label: 'Breve' },
  { key: 'urgencia',      label: 'Con urgencia' },
  { key: 'personalizada', label: 'Personalizada' },
]

/** Métodos de pago de una venta registrada a mano. */
export const METODOS_PAGO = ['EFECTIVO', 'SINPE', 'TARJETA', 'TRANSFERENCIA']

export function filtrarProductosConStock(productos: Producto[], search: string): Producto[] {
  return productos.filter((p) =>
    p.stock > 0 && (!search || p.nombre?.toLowerCase().includes(search.toLowerCase()))
  )
}

export function agregarItemCarrito(prev: ItemCarritoVenta[], producto: Producto): ItemCarritoVenta[] {
  const existente = prev.find((i) => i.id === producto.id)
  if (existente) {
    return prev.map((i) => i.id === producto.id
      ? { ...i, cantidad: Math.min(i.cantidad + 1, producto.stock) }
      : i)
  }
  return [...prev, { ...producto, cantidad: 1 }]
}

export function actualizarCantidadCarrito(prev: ItemCarritoVenta[], id: Producto['id'], val: string | number): ItemCarritoVenta[] {
  const n = Number(val)
  if (n < 1) return prev.filter((i) => i.id !== id)
  return prev.map((i) => i.id === id ? { ...i, cantidad: n } : i)
}

export function buildCotizacionTemplates({ items, cotNombre, cotTelefono, cotNota, subtotal, envioNum, total }: {
  items: ItemCarritoVenta[]
  cotNombre: string
  cotTelefono: string
  cotNota: string
  subtotal: number
  envioNum: number
  total: number
}): CotizacionTemplates {
  const lines = items.map((i) => `• ${i.nombre} ×${i.cantidad} — ${formatPrice(i.precio * i.cantidad)}`)
  const quien = cotNombre ? ` para *${cotNombre}*` : ''
  const tel = cotTelefono ? ` (${cotTelefono})` : ''
  const totales = [
    '',
    `Subtotal: ${formatPrice(subtotal)}`,
    ...(envioNum > 0 ? [`Envío: ${formatPrice(envioNum)}`] : []),
    `*Total estimado: ${formatPrice(total)}*`,
    ...(cotNota ? ['', `Nota: ${cotNota}`] : []),
  ]

  const formal = [
    `Hola HotClick, solicito una *cotización formal*${quien}${tel}:`,
    '', ...lines, ...totales,
    '', '¿Pueden confirmar disponibilidad, tiempo de entrega y métodos de pago? Gracias.',
  ].join('\n')

  const breve = [
    `Hola, quiero cotizar${quien}${tel}:`,
    '', ...lines, ...totales,
    '', '¿Disponible? Gracias.',
  ].join('\n')

  const urgencia = [
    `Hola HotClick, necesito esta cotización con *urgencia*${quien}${tel}:`,
    '', ...lines, ...totales,
    '', '¿Me pueden confirmar disponibilidad hoy mismo? Es para entrega pronta. Gracias.',
  ].join('\n')

  const personalizada = [
    `Hola HotClick${quien}${tel}, `,
    '', ...lines, ...totales,
  ].join('\n')

  return { formal, breve, urgencia, personalizada }
}

export function mensajeErrorVenta(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return fallback
  const data = (err as { response?: { data?: { message?: unknown } } }).response?.data
  const message = data && typeof data === 'object' && 'message' in data ? data.message : undefined
  return typeof message === 'string' && message ? message : fallback
}
