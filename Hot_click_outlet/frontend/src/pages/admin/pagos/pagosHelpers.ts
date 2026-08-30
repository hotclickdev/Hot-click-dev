import type { Id } from '@/types/api'

export const TAMANO_PAGINA = 20

export const PROVEEDORES = ['', 'ONVO', 'STRIPE', 'SINPE']
export const ESTADOS_PAGO = ['', 'CAPTURADO', 'PENDIENTE', 'FALLIDO', 'CANCELADO']
export const ESTADOS_COMPROBANTE = ['', 'PENDIENTE', 'APROBADO', 'RECHAZADO']

export const COLUMNAS_EXPORT_PAGOS = ['id', 'pedidoId', 'proveedor', 'estado', 'monto', 'moneda', 'fecha']
export const COLUMNAS_EXPORT_WEBHOOKS = ['id', 'proveedor', 'evento', 'procesado', 'fecha']

export const BADGE: Record<string, string> = {
  CAPTURADO: 'bg-green-500/15 text-green-400 border-green-500/30',
  PENDIENTE: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  FALLIDO: 'bg-red-500/15 text-red-400 border-red-500/30',
  CANCELADO: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
}

export const BADGE_WH: Record<string, string> = {
  true: 'bg-green-500/15 text-green-400 border-green-500/30',
  false: 'bg-red-500/15 text-red-400 border-red-500/30',
}

export type PagoAdmin = {
  id?: Id
  numeroPedido?: string
  proveedor?: string
  estadoPago?: string
  monto?: number
  correoUsuario?: string
  merchantToken?: string
  fechaCreacion?: string
  pedidoId?: Id
  moneda?: string
  fechaPago?: string
  createdAt?: string
}

export type WebhookAdmin = {
  id?: Id
  merchantToken?: string
  eventoTipo?: string
  ipOrigen?: string
  procesado?: boolean
  errorProcesamiento?: string | null
  fechaRecepcion?: string
  procesadoEn?: string | null
  proveedor?: string
  evento?: string
  createdAt?: string
}

export type ComprobanteAdmin = {
  id?: Id
  numeroPedido?: string
  estado?: string
  monto?: number | null
  fechaSubida?: string
  fechaResolucion?: string | null
  adminEmail?: string | null
  notasAdmin?: string | null
  nombreRemitente?: string | null
  cedulaRemitente?: string | null
  telefonoRemitente?: string | null
  correoRemitente?: string | null
  urlComprobante?: string | null
}

export type PagosKpis = {
  total?: number
  tasaExito?: number
  pendientes?: number
  webhooksErr?: number
  capturados?: number
  fallidos?: number
  sinpe?: number
  stripe?: number
}

export type OpcionSelect = { value: string; label: string }

export function queryPagos({ page, proveedor, estadoPago }: { page: number; proveedor?: string; estadoPago?: string }): string {
  const params = new URLSearchParams({ page: String(page), size: String(TAMANO_PAGINA) })
  if (proveedor) params.set('proveedor', proveedor)
  if (estadoPago) params.set('estadoPago', estadoPago)
  return params.toString()
}

export function queryWebhooks({ page, procesado }: { page: number; procesado: string }): string {
  const params = new URLSearchParams({ page: String(page), size: String(TAMANO_PAGINA) })
  if (procesado !== '') params.set('procesado', procesado)
  return params.toString()
}

export function filasExportPagos(pagos: PagoAdmin[]) {
  return pagos.map((p) => ({
    id: p.id,
    pedidoId: p.pedidoId ?? '',
    proveedor: p.proveedor ?? '',
    estado: p.estadoPago ?? '',
    monto: p.monto ?? 0,
    moneda: p.moneda ?? '',
    fecha: (p.fechaPago ?? p.createdAt ?? '').slice(0, 10),
  }))
}

export function filasExportWebhooks(webhooks: WebhookAdmin[]) {
  return webhooks.map((w) => ({
    id: w.id,
    proveedor: w.proveedor ?? '',
    evento: w.evento ?? '',
    procesado: w.procesado ? 'SI' : 'NO',
    fecha: (w.createdAt ?? '').slice(0, 10),
  }))
}

export function claseEstadoComprobante(estado: string): string {
  if (estado === 'PENDIENTE') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
  if (estado === 'APROBADO') return 'bg-green-500/15 text-green-400 border-green-500/30'
  return 'bg-red-500/15 text-red-400 border-red-500/30'
}

export function mensajeErrorPago(err: unknown, respaldo: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return respaldo
  const data = (err as { response?: { data?: { message?: unknown } } }).response?.data
  const message = data && typeof data === 'object' && 'message' in data ? data.message : undefined
  return (typeof message === 'string' && message) ? message : respaldo
}
