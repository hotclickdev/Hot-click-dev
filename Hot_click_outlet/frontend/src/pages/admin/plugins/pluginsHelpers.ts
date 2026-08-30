import type { Id } from '@/types/api'

export const EVENTOS_DISPONIBLES = [
  { id: 'pedido.creado',    label: 'Pedido creado' },
  { id: 'pedido.pagado',    label: 'Pedido pagado' },
  { id: 'pedido.entregado', label: 'Pedido entregado' },
  { id: 'pedido.cancelado', label: 'Pedido cancelado' },
  { id: 'gift_card.canjeada', label: 'Gift card canjeada' },
  { id: 'plugin.test',     label: 'Test (siempre se envía)' },
]

export const ESTADO_STYLE: Record<string, string> = {
  ENVIADO:  'text-green-400 bg-green-400/10',
  FALLIDO:  'text-red-400 bg-red-400/10',
  PENDIENTE: 'text-amber-400 bg-amber-400/10',
}

export type PluginForm = {
  nombre: string
  descripcion: string
  tipo: string
  url: string
  eventosSuscritos: string
  secretoHmac: string
}

export const FORM_VACIO: PluginForm = { nombre: '', descripcion: '', tipo: 'WEBHOOK', url: '', eventosSuscritos: '[]', secretoHmac: '' }

export type PluginAdmin = {
  id: Id
  nombre: string
  descripcion?: string
  tipo: string
  url: string
  eventosSuscritos?: string
  activo?: boolean
  tieneSecretoHmac?: boolean
}

export type PluginLog = {
  id: Id
  estado?: string
  evento?: string
  codigoRespuesta?: number | string
  mensajeError?: string
  fechaEnvio?: string
}

export function parseEventos(value: string | null | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed as string[] : []
  } catch {
    return []
  }
}

export function mensajeErrorPlugin(err: unknown, respaldo: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return respaldo
  const data = (err as { response?: { data?: { error?: unknown } } }).response?.data
  const error = data && typeof data === 'object' && 'error' in data ? data.error : undefined
  return (typeof error === 'string' && error) ? error : respaldo
}
