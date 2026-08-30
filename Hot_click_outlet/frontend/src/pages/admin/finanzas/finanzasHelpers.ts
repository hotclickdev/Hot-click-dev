import type { Id } from '@/types/api'
import type { Pedido } from '@/types/pedido'

export const ESTADOS_COMPLETADOS = new Set(['ENTREGADO', 'COMPLETADO'])

export const QUICK_DAYS = [0, 7, 30, -1] as const
export type QuickDays = (typeof QUICK_DAYS)[number]
export const QUICK_LABEL: Record<QuickDays, string> = { 0: 'Hoy', 7: '7 días', 30: '30 días', [-1]: 'Todo' }

export const CATEGORIAS = [
  'ALQUILER',
  'SALARIOS',
  'MARKETING',
  'ENVIOS_EXTERNOS',
  'SERVICIOS',
  'INSUMOS',
  'IMPUESTOS',
  'OTRO',
]

export const COLUMNAS_EXPORT_INGRESOS = [
  'id',
  'fecha',
  'origen',
  'metodoPago',
  'productos',
  'envio',
  'total',
]

const ORIGEN_BG: Record<string, string> = {
  ONLINE: 'rgba(23,71,168,0.12)',
  POS: 'rgba(52,211,153,0.12)',
  MANUAL: 'rgba(251,191,36,0.12)',
}

const ORIGEN_COLOR: Record<string, string> = {
  ONLINE: 'var(--hc-accent)',
  POS: '#34d399',
  MANUAL: '#fbbf24',
}

export type PedidoFinanzas = Pedido & {
  usuarioFinal?: { id?: Id; nombre?: string }
  telefono?: string
  direccionEntrega?: string
  urlTracking?: string | null
}

export type GastoForm = {
  id?: Id
  concepto: string
  monto: string | number
  categoria: string
  fecha: string
  notas: string
}

export type GastoAdmin = GastoForm & {
  id: Id
}

export function toISO(fecha: Date) {
  return fecha.toISOString().slice(0, 10)
}

export const EMPTY_GASTO: GastoForm = {
  concepto: '',
  monto: '',
  categoria: 'OTRO',
  fecha: toISO(new Date()),
  notas: '',
}

export function rangoDesdeQuick(days: number) {
  if (days === -1) return { desde: '', hasta: '' }
  if (days === 0) {
    const hoy = toISO(new Date())
    return { desde: hoy, hasta: hoy }
  }
  const fin = new Date()
  const inicio = new Date()
  inicio.setDate(inicio.getDate() - days)
  return { desde: toISO(inicio), hasta: toISO(fin) }
}

export function listaPedidosDesdeRespuesta(data: unknown): PedidoFinanzas[] {
  const wrapped = data && typeof data === 'object' && 'data' in data
    ? (data as { data: unknown }).data
    : data
  const raw = wrapped
  const all = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && 'content' in raw
      ? (raw as { content?: unknown }).content ?? []
      : []
  const lista = Array.isArray(all) ? all as PedidoFinanzas[] : []
  return lista.filter((p) => ESTADOS_COMPLETADOS.has(p.estado ?? p.estadoPedido ?? ''))
}

export function pedidoEnPeriodo(pedido: PedidoFinanzas, desde: string, hasta: string) {
  const fecha = (pedido.fechaCreacion ?? pedido.fechaPedido ?? '').slice(0, 10)
  if (desde && fecha < desde) return false
  if (hasta && fecha > hasta) return false
  return true
}

export function envioDePedido(pedido: PedidoFinanzas) {
  return pedido.costoEnvio ?? 0
}

export function subtotalDePedido(pedido: PedidoFinanzas) {
  return pedido.subtotal ?? ((pedido.total ?? pedido.totalPedido ?? 0) - envioDePedido(pedido))
}

export function totalDePedido(pedido: PedidoFinanzas) {
  return pedido.total ?? pedido.totalPedido ?? 0
}

export function clienteDePedido(pedido: PedidoFinanzas) {
  return pedido.usuarioFinal?.nombre ?? pedido.nombreCliente ?? '—'
}

export function fechaDePedido(pedido: PedidoFinanzas) {
  return pedido.fechaCreacion ?? pedido.fechaPedido
}

export function filasExportIngresos(pedidos: PedidoFinanzas[]) {
  return pedidos.map((pedido) => ({
    id: pedido.id,
    fecha: (pedido.fechaCreacion ?? pedido.fechaPedido ?? '').slice(0, 10),
    origen: pedido.origen ?? 'ONLINE',
    metodoPago: pedido.metodoPago,
    productos: subtotalDePedido(pedido),
    envio: envioDePedido(pedido),
    total: totalDePedido(pedido),
  }))
}

export function estiloOrigen(origen?: string) {
  const key = origen ?? 'ONLINE'
  return {
    backgroundColor: ORIGEN_BG[key] ?? 'rgba(255,255,255,0.06)',
    color: ORIGEN_COLOR[key] ?? '#A7B0BC',
  }
}

export function porcentajeDe(parte: number, total: number) {
  if (total <= 0) return 0
  return ((parte / total) * 100).toFixed(0)
}
