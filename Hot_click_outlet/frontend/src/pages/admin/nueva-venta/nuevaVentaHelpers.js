import { formatPrice } from '@/utils/format'

/** Etapas de un pedido con retiro en local. */
export const ETAPAS_RETIRO = [
  { key: 'PENDIENTE',      label: 'Pendiente' },
  { key: 'PAGADO',         label: 'Pago confirmado' },
  { key: 'EN_PREPARACION', label: 'En preparación' },
  { key: 'LISTO_RETIRO',   label: 'Listo p/ retirar' },
  { key: 'ENTREGADO',      label: 'Retirado' },
  { key: 'COMPLETADO',     label: 'Completado' },
]

/** Etapas de un pedido con envío a domicilio. */
export const ETAPAS_ENVIO = [
  { key: 'PENDIENTE',      label: 'Pendiente' },
  { key: 'PAGADO',         label: 'Pago confirmado' },
  { key: 'EN_PREPARACION', label: 'En preparación' },
  { key: 'ENVIADO',        label: 'Enviado' },
  { key: 'ENTREGADO',      label: 'Entregado' },
  { key: 'COMPLETADO',     label: 'Completado' },
]

/** Número de WhatsApp/SINPE Móvil de HOTCLICK (sin +). */
export const WHATSAPP = '50686667888'

/** Pestañas de nueva venta (id + etiqueta). Los íconos viven en nuevaVentaIcons.jsx. */
export const TABS = [
  { id: 'cliente', label: 'Venta con Cliente' },
  { id: 'rapida',  label: 'Venta Rápida' },
  { id: 'cotizar', label: 'Cotización WhatsApp' },
]

/** Variantes del mensaje de cotización por WhatsApp. */
export const WA_TABS = [
  { key: 'formal',        label: 'Formal' },
  { key: 'breve',         label: 'Breve' },
  { key: 'urgencia',      label: 'Con urgencia' },
  { key: 'personalizada', label: 'Personalizada' },
]

/** Métodos de pago de una venta registrada a mano. */
export const METODOS_PAGO = ['EFECTIVO', 'SINPE', 'TARJETA', 'TRANSFERENCIA']

/**
 * @param {object[]} productos
 * @param {string} search
 * @returns {object[]}
 */
export function filtrarProductosConStock(productos, search) {
  return productos.filter((p) =>
    p.stock > 0 && (!search || p.nombre?.toLowerCase().includes(search.toLowerCase()))
  )
}

/**
 * @param {object[]} prev
 * @param {object} producto
 * @returns {object[]}
 */
export function agregarItemCarrito(prev, producto) {
  const existente = prev.find((i) => i.id === producto.id)
  if (existente) {
    return prev.map((i) => i.id === producto.id
      ? { ...i, cantidad: Math.min(i.cantidad + 1, producto.stock) }
      : i)
  }
  return [...prev, { ...producto, cantidad: 1 }]
}

/**
 * @param {object[]} prev
 * @param {number} id
 * @param {string|number} val
 * @returns {object[]}
 */
export function actualizarCantidadCarrito(prev, id, val) {
  const n = Number(val)
  if (n < 1) return prev.filter((i) => i.id !== id)
  return prev.map((i) => i.id === id ? { ...i, cantidad: n } : i)
}

/**
 * @param {{
 *   items: object[]
 *   cotNombre: string
 *   cotTelefono: string
 *   cotNota: string
 *   subtotal: number
 *   envioNum: number
 *   total: number
 * }} params
 * @returns {{ formal: string, breve: string, urgencia: string, personalizada: string }}
 */
export function buildCotizacionTemplates({ items, cotNombre, cotTelefono, cotNota, subtotal, envioNum, total }) {
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
