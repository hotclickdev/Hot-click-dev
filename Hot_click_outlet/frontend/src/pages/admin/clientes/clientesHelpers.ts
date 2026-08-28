import type { Id } from '@/types/api'

export type ClienteCrm = {
  id: Id
  nombre?: string
  apellidoPaterno?: string
  correo?: string
  telefono?: string
  segmento?: string
  numPedidosHist?: number
  totalComprasHist?: number
  puntosFidelidad?: number
  fechaUltimoAcceso?: string
  ultimaCompra?: string
}

const MS_30_DIAS = 30 * 86_400_000

export function esInactivo30d(cliente: Pick<ClienteCrm, 'fechaUltimoAcceso' | 'ultimaCompra' | 'segmento'>): boolean {
  const fecha = cliente.fechaUltimoAcceso ?? cliente.ultimaCompra
  if (!fecha) return cliente.segmento === 'INACTIVO'
  return Date.now() - new Date(fecha).getTime() > MS_30_DIAS
}

export function mensajeErrorCliente(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback
  const message = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' ? message : fallback
}
