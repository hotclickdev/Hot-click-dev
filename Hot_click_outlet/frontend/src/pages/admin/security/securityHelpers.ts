import type { Id } from '@/types/api'

export const PERIODS = [
  { value: '1h',  label: '1h'    },
  { value: '24h', label: '24h'   },
  { value: '7d',  label: '7 días'},
  { value: '30d', label: '30 días'},
]

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string

export type SeverityStyle = { bg: string; text: string; border: string }

// MEDIUM y HIGH comparten el mismo tono (warning): la marca solo define 3 pares
// semánticos (success/warning/danger), no hay un 4to tono propio — decisión del
// dueño del producto, no un descuido.
export const SEVERITY_COLOR: Record<string, SeverityStyle> = {
  LOW:      { bg: 'var(--hc-success-bg)', text: 'var(--hc-success)', border: 'color-mix(in srgb, var(--hc-success) 30%, transparent)' },
  MEDIUM:   { bg: 'var(--hc-warning-bg)', text: 'var(--hc-warning)', border: 'color-mix(in srgb, var(--hc-warning) 30%, transparent)' },
  HIGH:     { bg: 'var(--hc-warning-bg)', text: 'var(--hc-warning)', border: 'color-mix(in srgb, var(--hc-warning) 30%, transparent)' },
  CRITICAL: { bg: 'var(--hc-danger-bg)',  text: 'var(--hc-danger)',  border: 'color-mix(in srgb, var(--hc-danger) 30%, transparent)'  },
}

export const EVENT_LABEL: Record<string, string> = {
  LOGIN_SUCCESS: 'Login exitoso', LOGIN_FAILED: 'Login fallido', LOGIN_BLOCKED: 'Login bloqueado',
  LOGOUT: 'Logout', PASSWORD_RESET_REQUEST: 'Reset contraseña', PASSWORD_RESET_SUCCESS: 'Reset exitoso',
  PASSWORD_CHANGED: 'Contraseña cambiada', TWO_FA_SETUP: '2FA configurado', TWO_FA_ENABLED: '2FA activado',
  TWO_FA_DISABLED: '2FA desactivado', TWO_FA_FAILED: '2FA fallido', OTP_SENT: 'OTP enviado',
  OTP_VERIFIED: 'OTP verificado', TOKEN_REJECTED: 'Token rechazado', TOKEN_EXPIRED: 'Token expirado',
  TOKEN_REFRESH: 'Token refrescado', PERMISSION_DENIED: 'Permiso denegado',
  RATE_LIMIT_TRIGGERED: 'Rate limit', UPLOAD_REJECTED: 'Upload rechazado',
  SUSPICIOUS_ACTIVITY: 'Actividad sospechosa', BRUTE_FORCE_DETECTED: 'Brute force',
  OTP_ABUSE_DETECTED: 'OTP abuse', JWT_SCANNING_DETECTED: 'JWT scanning',
  CREDENTIAL_STUFFING_DETECTED: 'Credential stuffing', REGISTRATION_SUCCESS: 'Registro exitoso',
  REGISTRATION_FAILED: 'Registro fallido', ADMIN_ACTION: 'Acción admin',
  PRISON_IP_DETECTED: 'IP centro penitenciario',
  ABUSIVE_IP_DETECTED: 'IP reputación abusiva',
}

export type SecurityEvent = {
  id: Id
  timestamp?: string
  severity?: SecuritySeverity
  eventType?: string
  ipAddress?: string
  email?: string
  endpoint?: string
}

export type SecurityAlert = {
  id: Id
  severity?: SecuritySeverity
  alertType?: string
  createdAt?: string
  message?: string
  details?: string
  ipAddress?: string
  userId?: Id
  resolved?: boolean
}

export type SecurityDashboard = {
  summary?: {
    totalEvents?: number
    failedLogins?: number
    tokenRejections?: number
    rateLimitEvents?: number
    activeAlerts?: number
  }
  twoFactorAdoption?: {
    adoptionPercent?: number
    enabled?: number
    total?: number
  }
  eventsByType?: Record<string, number>
  eventsBySeverity?: Record<string, number>
  recentEvents?: SecurityEvent[]
  activeAlerts?: SecurityAlert[]
}

export type SesionesActivas = {
  activas30min?: number
  activas24h?: number
}

export type SecurityUsuario = {
  id: Id
  nombre?: string
  correo?: string
  roles?: string[]
  twoFactorEnabled?: boolean
  loginsExitosos?: number
  loginsFallidos?: number
  ipsDistintas?: number
  fechaRegistro?: string
  fechaUltimoAcceso?: string
  bloqueadoHasta?: string | null
  intentosFallidos?: number
}

export type EventosPorUsuario = {
  ips?: string[]
  porTipo?: Record<string, number>
  eventos?: SecurityEvent[]
}

export type IpSospechosa = {
  ip: string
  totalRequests?: number
  loginsFallidos?: number
  ultimoEvento?: string
  bloqueada?: boolean
}

export type IpBloqueada = {
  id: Id
  ipAddress: string
  motivo?: string
  bloqueadaPor?: string
  fechaBloqueo?: string
  activa?: boolean
}

export type PaginaSecurity<T> = {
  content: T[]
  totalElements?: number
  totalPages?: number
  page?: number
}

export function timeAgo(dateStr?: string | number | Date | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60)  return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

export function fmtDate(d?: string | number | Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })
}
