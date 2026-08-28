import type { Id } from '@/types/api'

export const fmt = (n: number | null | undefined) => new Intl.NumberFormat('es-CR').format(n ?? 0)
export const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('es-CR') : '—')

export const ESTADO_META: Record<string, { label: string; bg: string; text: string }> = {
  PENDIENTE:  { label: 'Pendiente',  bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24' },
  PARCIAL:    { label: 'Parcial',    bg: 'rgba(96,165,250,0.12)',  text: '#6490EA' },
  RECIBIDA:   { label: 'Recibida',   bg: 'rgba(52,211,153,0.12)', text: '#34d399' },
  CANCELADA:  { label: 'Cancelada',  bg: 'rgba(239,68,68,0.12)',  text: '#f87171' },
}

export const FILTROS_COMPRAS = ['TODAS', 'PENDIENTE', 'PARCIAL', 'RECIBIDA', 'CANCELADA'] as const
export type FiltroCompras = (typeof FILTROS_COMPRAS)[number]

export type CompraItem = {
  id: Id
  cantidad: number
  cantidadRecibida: number
  precioUnitario: number
  producto?: { nombreProducto?: string }
}

export type OrdenCompra = {
  id: Id
  numeroOrden?: string
  estado?: string
  proveedor?: { nombre?: string }
  fechaOrden?: string
  fechaRecepcion?: string
  items?: CompraItem[]
  usuario?: { nombre?: string }
  total?: number
  notas?: string
}

export type ToastCompras = (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

export function mensajeErrorCompra(err: unknown, respaldo: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return respaldo
  const data = (err as { response?: { data?: { message?: unknown } } }).response?.data
  const message = data && typeof data === 'object' && 'message' in data ? data.message : undefined
  return (typeof message === 'string' && message) ? message : respaldo
}
