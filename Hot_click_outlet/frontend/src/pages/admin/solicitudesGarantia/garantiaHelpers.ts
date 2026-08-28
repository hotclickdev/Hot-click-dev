import type { Id } from '@/types/api'

export const ESTADOS = ['PENDIENTE', 'EN_REVISION', 'RESUELTA', 'RECHAZADA'] as const
export type EstadoGarantia = (typeof ESTADOS)[number]

export const ESTADO_CFG: Record<string, { color: string; bg: string; label: string }> = {
  PENDIENTE:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   label: 'Pendiente' },
  EN_REVISION: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   label: 'En revisión' },
  RESUELTA:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',   label: 'Resuelta' },
  RECHAZADA:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    label: 'Rechazada' },
}

export type SolicitudGarantia = {
  id: Id
  estado: string
  descripcion?: string
  notasAdmin?: string | null
  fechaCreacion: string
  productoId?: Id
  productoNombre?: string
  productoImagenUrl?: string | null
  numeroPedido?: string | null
  usuarioNombre?: string
  usuarioCorreo?: string
  usuarioTelefono?: string
}

export function waLinkGarantia(s: SolicitudGarantia): string | null {
  const tel = s.usuarioTelefono || ''
  if (!tel) return null
  const num = tel.replace(/\D/g, '')
  const full = num.startsWith('506') ? num : `506${num}`
  const msg = encodeURIComponent(
    `Hola ${s.usuarioNombre || ''}! Te contactamos de HotClick sobre tu solicitud de garantía del producto "${(s.productoNombre || '').slice(0, 50)}".`
  )
  return `https://wa.me/${full}?text=${msg}`
}
