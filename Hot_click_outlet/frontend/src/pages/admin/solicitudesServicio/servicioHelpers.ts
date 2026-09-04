import type { Id } from '@/types/api'

export const ESTADOS = ['PENDIENTE', 'EN_BUSQUEDA', 'ENCONTRADO', 'NO_ENCONTRADO', 'CANCELADO'] as const
export type EstadoServicio = (typeof ESTADOS)[number]

/** Tokens de marca (hotclick-tokens.css) — no colores Tailwind sueltos. */
export const ESTADO_STYLES: Record<string, { color: string; bg: string }> = {
  PENDIENTE:     { color: 'var(--hc-warning)', bg: 'var(--hc-warning-bg)' },
  EN_BUSQUEDA:   { color: 'var(--hc-accent)',  bg: '#EFF4FE' },
  ENCONTRADO:    { color: 'var(--hc-success)', bg: 'var(--hc-success-bg)' },
  NO_ENCONTRADO: { color: 'var(--hc-danger)',  bg: 'var(--hc-danger-bg)' },
  CANCELADO:     { color: 'var(--hc-muted)',   bg: 'var(--hc-surface-2)' },
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
