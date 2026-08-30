import type { CSSProperties } from 'react'
import type { Id } from '@/types/api'
import type { ItemPedido, Pedido } from '@/types/pedido'
import type { Producto } from '@/types/producto'

export const ESTADOS_COMPLETADOS = new Set(['COMPLETADO', 'ENTREGADO'])

export const fmt = (n: number | null | undefined) => new Intl.NumberFormat('es-CR').format(n ?? 0)
export const TABLE_SIZE = 25

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
] as const

export type TabReportes = (typeof TABS)[number]['key']

export const COLUMNAS_EXPORT_VENTAS = ['id', 'cliente', 'productos', 'envio', 'total', 'metodo', 'estado', 'fecha']

export const inputCls = 'h-9 px-3 rounded-xl text-sm focus:outline-none'
export const inputStyle: CSSProperties = { backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }
export const cardStyle: CSSProperties = { backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }

export type ItemVentaReporte = ItemPedido & {
  producto?: { id?: Id; nombreProducto?: string }
  subtotalItem?: number
  costoUnitarioMomento?: number
  precioUnitarioMomento?: number
}

export type VentaReporte = Omit<Pedido, 'items'> & {
  cliente?: { nombre?: string }
  usuarioFinal?: { id?: Id; nombre?: string }
  items?: ItemVentaReporte[]
}

export type ProductoReporte = Producto & {
  stockMinimo?: number
}

export type TopProductoReporte = {
  id: Id
  nombre: string
  cantidad: number
  ingreso: number
  costo: number
  utilidad: number
  margen: string
}

export type FiltrosVentas = {
  desde: string
  hasta: string
  metodoPago: string
  estado: string
  search: string
}

export function toISO(date: Date) { return date.toISOString().slice(0, 10) }

export function rangoQuick(days: number) {
  if (days === -1) return { desde: '', hasta: '' }
  const end = new Date(), start = new Date()
  if (days > 0) start.setDate(start.getDate() - days)
  return { desde: toISO(start), hasta: toISO(end) }
}

export function filtrarVentas(ventas: VentaReporte[], { desde, hasta, metodoPago, estado, search }: FiltrosVentas) {
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

export function kpisVentas(filtered: VentaReporte[]) {
  const completadas   = filtered.filter(v => ESTADOS_COMPLETADOS.has(v.estado ?? ''))
  const totalIngresos = completadas.reduce((s, v) => s + (v.total ?? v.totalPedido ?? 0), 0)
  const totalEnvios   = completadas.reduce((s, v) => s + (v.costoEnvio ?? 0), 0)
  const totalProductos= totalIngresos - totalEnvios
  const ticketPromedio= completadas.length > 0 ? Math.round(totalIngresos / completadas.length) : 0
  return { completadas, totalIngresos, totalEnvios, totalProductos, ticketPromedio }
}

export function topProductosDe(completadas: VentaReporte[]): TopProductoReporte[] {
  const map: Record<string, { id: Id; nombre: string; cantidad: number; ingreso: number; costo: number }> = {}
  completadas.forEach(v => {
    (v.items ?? []).forEach(item => {
      const id   = item.producto?.id ?? item.productoId
      const name = item.producto?.nombreProducto ?? item.nombreProducto ?? `#${id}`
      if (!id) return
      const key = String(id)
      if (!map[key]) map[key] = { id, nombre: name, cantidad: 0, ingreso: 0, costo: 0 }
      map[key].cantidad += Number(item.cantidad ?? 1)
      map[key].ingreso  += Number(item.subtotalItem ?? (Number(item.cantidad) * Number(item.precioUnitarioMomento)))
      map[key].costo    += (item.costoUnitarioMomento ?? 0) * Number(item.cantidad ?? 1)
    })
  })
  return Object.values(map)
    .map(p => ({ ...p, utilidad: p.ingreso - p.costo, margen: p.ingreso > 0 ? ((p.ingreso - p.costo) / p.ingreso * 100).toFixed(1) : '0' }))
    .sort((a, b) => b.ingreso - a.ingreso)
    .slice(0, 50)
}

export function stockEnRiesgo(productos: ProductoReporte[]) {
  return productos
    .filter(p => (p.stockActual ?? p.stock ?? 0) <= (p.stockMinimo ?? 5))
    .sort((a, b) => (a.stockActual ?? a.stock ?? 0) - (b.stockActual ?? b.stock ?? 0))
}

export function filtrarPos(posVentas: unknown, desde: string, hasta: string): VentaReporte[] {
  const listaRaw = posVentas && typeof posVentas === 'object' && 'data' in posVentas
    ? (posVentas as { data?: unknown }).data ?? posVentas
    : posVentas ?? []
  const lista = Array.isArray(listaRaw) ? listaRaw as VentaReporte[] : []
  return lista.filter(v => {
    const fecha = (v.fechaPedido ?? '').slice(0, 10)
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return true
  })
}

export function kpisPos(posFiltradas: VentaReporte[]) {
  const posTotal      = posFiltradas.reduce((s, v) => s + (v.totalPedido ?? 0), 0)
  const posTx         = posFiltradas.length
  const posTicket     = posTx > 0 ? Math.round(posTotal / posTx) : 0
  return { posTotal, posTx, posTicket }
}

export function filasExportVentas(filtered: VentaReporte[]) {
  return filtered.map(v => ({ id:v.id, cliente:v.nombreCliente??'', productos:(v.total??0)-(v.costoEnvio??0), envio:v.costoEnvio??0, total:v.total??0, metodo:v.metodoPago??'', estado:v.estado??'', fecha:(v.fechaCreacion??'').slice(0,10) }))
}

export function listaVentasDesdeRespuesta(data: unknown): VentaReporte[] {
  if (Array.isArray(data)) return data as VentaReporte[]
  if (data && typeof data === 'object' && 'content' in data) {
    return ((data as { content?: unknown }).content ?? []) as VentaReporte[]
  }
  return []
}

export function listaProductosDesdeRespuesta(data: unknown): ProductoReporte[] {
  if (Array.isArray(data)) return data as ProductoReporte[]
  if (data && typeof data === 'object' && 'content' in data) {
    return ((data as { content?: unknown }).content ?? []) as ProductoReporte[]
  }
  return []
}
