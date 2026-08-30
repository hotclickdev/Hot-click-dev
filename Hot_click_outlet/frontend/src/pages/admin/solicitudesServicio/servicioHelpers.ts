import type { Id } from '@/types/api'

export const ESTADOS = ['PENDIENTE', 'EN_BUSQUEDA', 'ENCONTRADO', 'NO_ENCONTRADO', 'CANCELADO'] as const
export type EstadoServicio = (typeof ESTADOS)[number]

export const ESTADO_STYLES: Record<string, { color: string; bg: string }> = {
  PENDIENTE:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  EN_BUSQUEDA:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  ENCONTRADO:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  NO_ENCONTRADO: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  CANCELADO:     { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

export type UsuarioServicio = {
  nombre?: string
  apellidoPaterno?: string
  telefono?: string
  correo?: string
}

export type SolicitudServicio = {
  id: Id
  estado: string
  descripcion: string
  fotosUrls?: string | null
  nombreContacto?: string
  telefonoContacto?: string
  presupuesto?: string
  notasAdmin?: string | null
  fechaCreacion: string
  usuario?: UsuarioServicio
}

export function waLinkServicio(s: SolicitudServicio): string | null {
  const tel = s.telefonoContacto || s.usuario?.telefono || ''
  if (!tel) return null
  const num = tel.replace(/\D/g, '')
  const full = num.startsWith('506') ? num : `506${num}`
  const msg = encodeURIComponent(
    `Hola ${s.nombreContacto || s.usuario?.nombre || ''}! Te contactamos de HotClick sobre tu solicitud de "${s.descripcion.slice(0, 60)}${s.descripcion.length > 60 ? '...' : ''}".`
  )
  return `https://wa.me/${full}?text=${msg}`
}

export function parseFotosUrls(fotosUrls: string | null | undefined): string[] {
  if (!fotosUrls) return []
  try {
    const parsed: unknown = JSON.parse(fotosUrls)
    return Array.isArray(parsed) ? parsed as string[] : []
  } catch {
    return []
  }
}
