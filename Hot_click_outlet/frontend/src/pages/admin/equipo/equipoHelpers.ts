import type { Id } from '@/types/api'

export type RolEquipoConfig = { label: string; color: string; desc: string }

export type FormularioEquipo = {
  nombre: string
  correo: string
  password: string
  telefono: string
  rolEnEmpresa: string
}

export type MiembroEquipo = {
  id: Id
  nombre?: string
  correo?: string
  rolEnEmpresa?: string
  estado?: number
  fechaIngreso?: string
}

export const ESTADO_LABEL: Record<number, string> = {
  1: 'Activo',
  2: 'Inactivo',
  3: 'Eliminado',
  4: 'Suspendido',
  5: 'Pendiente',
}

export const ESTADO_COLOR: Record<number, string> = {
  1: 'bg-green-500/15 text-green-400',
  2: 'bg-gray-500/15 text-gray-400',
  3: 'bg-red-500/15 text-red-400',
  4: 'bg-yellow-500/15 text-yellow-400',
  5: 'bg-blue-500/15 text-blue-400',
}

export const ROL_CONFIG: Record<string, RolEquipoConfig> = {
  PROPIETARIO: { label: 'Propietario', color: 'bg-amber-500/15 text-amber-400', desc: 'Control total' },
  ADMIN: { label: 'Admin', color: 'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)]', desc: 'Acceso completo' },
  EDITOR: { label: 'Editor', color: 'bg-blue-500/15 text-blue-400', desc: 'Edita productos y pedidos' },
  LECTOR: { label: 'Lector', color: 'bg-gray-500/15 text-gray-400', desc: 'Solo lectura' },
}

export const ROLES_ASIGNABLES = ['EDITOR', 'LECTOR']

export const FORMULARIO_EQUIPO_VACIO: FormularioEquipo = {
  nombre: '',
  correo: '',
  password: '',
  telefono: '',
  rolEnEmpresa: 'EDITOR',
}

export function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%'
  const bytes = crypto.getRandomValues(new Uint8Array(14))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

export function mensajeErrorEquipo(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback
  const message = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' && message ? message : fallback
}
