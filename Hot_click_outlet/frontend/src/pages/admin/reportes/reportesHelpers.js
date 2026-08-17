export const ESTADOS_COMPLETADOS = new Set(['COMPLETADO', 'ENTREGADO'])

/** @param {number} n */
export const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)
export const TABLE_SIZE = 25

// Colores semánticos pensados para tarjetas/tablas sobre fondo claro
// (los tonos "neón" originales estaban pensados para fondo oscuro y
// pierden contraste sobre var(--hc-surface)).
export const SUCCESS = '#1E7F4F'
export const WARNING = '#8a5a00'
export const DANGER  = '#a8291f'
export const INFO    = 'var(--hc-accent)'

export const QUICK = [
  { label: 'Hoy', days: 0 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '3 meses', days: 90 },
  { label: 'Todo', days: -1 },
]

export const TABS = [
  { key: 'ventas',     label: 'Ventas' },
  { key: 'productos',  label: 'Top Productos' },
  { key: 'pos',        label: 'POS' },
  { key: 'inventario', label: 'Inventario' },
]

export const COLUMNAS_EXPORT_VENTAS = ['id', 'cliente', 'productos', 'envio', 'total', 'metodo', 'estado', 'fecha']

export const inputCls = 'h-9 px-3 rounded-xl text-sm focus:outline-none'
export const inputStyle = { backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }
export const cardStyle = { backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }

/** @param {Date} date */
export function toISO(date) { return date.toISOString().slice(0, 10) }

/**
 * @param {number} days
 * @returns {{ desde: string, hasta: string }}
 */
export function rangoQuick(days) {
  if (days === -1) return { desde: '', hasta: '' }
  const end = new Date(), start = new Date()
  if (days > 0) start.setDate(start.getDate() - days)
  return { desde: toISO(start), hasta: toISO(end) }
}

/**
 * @param {object[]} ventas
 * @param {{ desde: string, hasta: string, metodoPago: string, estado: string, search: string }} filtros
 */
export function filtrarVentas(ventas, { desde, hasta, metodoPago, estado, search }) {
  return ventas.filter(v => {
    const fecha = (v.fechaCreacion ?? v.fechaPedido ?? '').slice(0, 10)
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    if (metodoPago && v.metodoPago !== metodoPago) return false
    if (estado && v.estado !== estado) return false
    if (search) {
      const q   = search.toLowerCase()
      const name = (v.nombreCliente ?? v.cliente?.nombre ?? '').toLowerCase()
      if (!name.includes(q) && !String(v.id).includes(q)) return false
    }
    return true
  })
}

/**
 * @param {object[]} filtered
 * @returns {{ completadas: object[], totalIngresos: number, totalEnvios: number, totalProductos: number, ticketPromedio: number }}
 */
export function kpisVentas(filtered) {
  const completadas   = filtered.filter(v => ESTADOS_COMPLETADOS.has(v.estado))
  const totalIngresos = completadas.reduce((s, v) => s + (v.total ?? v.totalPedido ?? 0), 0)
  const totalEnvios   = completadas.reduce((s, v) => s + (v.costoEnvio ?? 0), 0)
  const totalProductos= totalIngresos - totalEnvios
  const ticketPromedio= completadas.length > 0 ? Math.round(totalIngresos / completadas.length) : 0
  return { completadas, totalIngresos, totalEnvios, totalProductos, ticketPromedio }
}

/**
 * Top productos por ingreso a partir de ítems de pedidos completados.
 * @param {object[]} completadas
 */
export function topProductosDe(completadas) {
  const map = {}
  completadas.forEach(v => {
    (v.items ?? []).forEach(item => {
      const id   = item.producto?.id ?? item.productoId
      const name = item.producto?.nombreProducto ?? item.nombreProducto ?? `#${id}`
      if (!id) return
      if (!map[id]) map[id] = { id, nombre: name, cantidad: 0, ingreso: 0, costo: 0 }
      map[id].cantidad += item.cantidad ?? 1
      map[id].ingreso  += item.subtotalItem ?? (item.cantidad * item.precioUnitarioMomento)
      map[id].costo    += (item.costoUnitarioMomento ?? 0) * (item.cantidad ?? 1)
    })
  })
  return Object.values(map)
    .map(p => ({ ...p, utilidad: p.ingreso - p.costo, margen: p.ingreso > 0 ? ((p.ingreso - p.costo) / p.ingreso * 100).toFixed(1) : '0' }))
    .sort((a, b) => b.ingreso - a.ingreso)
    .slice(0, 50)
}

/**
 * Productos con stockActual ≤ stockMinimo (default 5).
 * @param {object[]} productos
 */
export function stockEnRiesgo(productos) {
  return productos
    .filter(p => (p.stockActual ?? p.stock ?? 0) <= (p.stockMinimo ?? 5))
    .sort((a, b) => (a.stockActual ?? a.stock ?? 0) - (b.stockActual ?? b.stock ?? 0))
}

/**
 * @param {object|object[]} posVentas
 * @param {string} desde
 * @param {string} hasta
 */
export function filtrarPos(posVentas, desde, hasta) {
  const lista = posVentas?.data ?? posVentas ?? []
  return lista.filter(v => {
    const fecha = (v.fechaPedido ?? '').slice(0, 10)
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return true
  })
}

/**
 * @param {object[]} posFiltradas
 * @returns {{ posTotal: number, posTx: number, posTicket: number }}
 */
export function kpisPos(posFiltradas) {
  const posTotal      = posFiltradas.reduce((s, v) => s + (v.totalPedido ?? 0), 0)
  const posTx         = posFiltradas.length
  const posTicket     = posTx > 0 ? Math.round(posTotal / posTx) : 0
  return { posTotal, posTx, posTicket }
}

/**
 * @param {object[]} filtered
 */
export function filasExportVentas(filtered) {
  return filtered.map(v => ({ id:v.id, cliente:v.nombreCliente??'', productos:(v.total??0)-(v.costoEnvio??0), envio:v.costoEnvio??0, total:v.total??0, metodo:v.metodoPago??'', estado:v.estado??'', fecha:(v.fechaCreacion??'').slice(0,10) }))
}
