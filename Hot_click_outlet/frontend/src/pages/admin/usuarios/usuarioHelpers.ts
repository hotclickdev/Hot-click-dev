import type { Id } from '@/types/api'
import type { BadgeProps } from '@/components/ui/Badge'

export type BadgeVariant = NonNullable<BadgeProps['variant']>

export type UsuarioAdmin = {
  id: Id
  nombre?: string
  correo?: string
  estado?: number
  empresaId?: Id | null
  roles?: { nombreRol?: string }[]
}

export type EmpresasPlanMap = Record<string, string | undefined>
export type EmpresasNombreMap = Record<string, string | undefined>

export const ESTADO_NUM: Record<number, string> = {
  1: 'ACTIVO',
  2: 'INACTIVO',
  3: 'ELIMINADO',
  4: 'SUSPENDIDO',
  5: 'PENDIENTE',
}

export const ESTADO_INT: Record<string, number> = { ACTIVO: 1, INACTIVO: 2 }

export const ROLES = [
  { value: 'USUARIO_FINAL', label: 'Cliente' },
  { value: 'EMPRENDEDOR', label: 'Emprendedor' },
  { value: 'ADMIN', label: 'Admin' },
]

export const ROLE_COLORS: Record<string, BadgeVariant> = {
  ADMIN: 'danger',
  EMPRENDEDOR: 'purple',
  USUARIO_FINAL: 'default',
}

export const FIGMA_ROL_LABEL: Record<string, string> = {
  EMPRENDEDOR: 'Vendedor',
  USUARIO_FINAL: 'Comprador',
  ADMIN: 'Admin',
  CAJERO: 'Cajero',
}

export function tonoRolFigma(rol: string, estado: string): { label: string; clase: string } {
  if (estado === 'SUSPENDIDO') {
    return { label: 'Suspendido', clase: 'bg-[var(--hc-danger-bg)] text-hc-danger' }
  }
  if (rol === 'USUARIO_FINAL') {
    return { label: 'Comprador', clase: 'bg-[var(--hc-success-bg)] text-hc-success' }
  }
  if (rol === 'EMPRENDEDOR') {
    return { label: 'Vendedor', clase: 'bg-[var(--hc-info-bg)] text-hc-link' }
  }
  return { label: FIGMA_ROL_LABEL[rol] ?? rol, clase: 'bg-hc-surface-2 text-hc-muted' }
}

export const PLANES = ['EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS']

export const PLAN_LABELS: Record<string, string> = {
  EMPRENDEDOR: 'Emprendedor',
  PYME: 'Pyme',
  NEGOCIO_PLUS: 'Negocio Plus',
}

export const PLAN_COLORS: Record<string, BadgeVariant> = {
  EMPRENDEDOR: 'default',
  PYME: 'accent',
  NEGOCIO_PLUS: 'warning',
}

export const ESTADO_BADGE: Record<string, BadgeVariant> = {
  ACTIVO: 'success',
  PENDIENTE: 'warning',
  INACTIVO: 'default',
  SUSPENDIDO: 'danger',
  ELIMINADO: 'danger',
}

export function getEstadoStr(u: Pick<UsuarioAdmin, 'estado'>): string {
  return ESTADO_NUM[u.estado ?? -1] ?? 'INACTIVO'
}

export function getRolStr(u: Pick<UsuarioAdmin, 'roles'>): string {
  return u.roles?.[0]?.nombreRol ?? 'USUARIO_FINAL'
}

export function listaUsuariosDesdeRespuesta(data: unknown): UsuarioAdmin[] {
  if (Array.isArray(data)) return data as UsuarioAdmin[]
  if (data && typeof data === 'object' && 'content' in data) {
    const content = (data as { content?: UsuarioAdmin[] }).content
    return content ?? []
  }
  return []
}

export function empresasPlanDesdeRespuesta(empresas: unknown): EmpresasPlanMap {
  const empresasList = Array.isArray(empresas)
    ? empresas
    : ((empresas as { data?: unknown; content?: unknown } | null)?.data
      ?? (empresas as { content?: unknown } | null)?.content
      ?? [])
  const filas = Array.isArray(empresasList) ? empresasList as { id: Id; plan?: string }[] : []
  return Object.fromEntries(filas.map((e) => [e.id, e.plan]))
}

export function empresasNombreDesdeRespuesta(empresas: unknown): EmpresasNombreMap {
  const empresasList = Array.isArray(empresas)
    ? empresas
    : ((empresas as { data?: unknown; content?: unknown } | null)?.data
      ?? (empresas as { content?: unknown } | null)?.content
      ?? [])
  const filas = Array.isArray(empresasList)
    ? empresasList as { id: Id; nombreComercial?: string; nombreEmpresa?: string }[]
    : []
  return Object.fromEntries(
    filas.map((e) => [e.id, e.nombreComercial || e.nombreEmpresa]),
  )
}

export function usuariosDesdeRespuestas(all: unknown, pend: unknown, empresas: unknown): {
  users: UsuarioAdmin[]
  pending: UsuarioAdmin[]
  empresasPlan: EmpresasPlanMap
  empresasNombre: EmpresasNombreMap
} {
  return {
    users: listaUsuariosDesdeRespuesta(all),
    pending: listaUsuariosDesdeRespuesta(pend),
    empresasPlan: empresasPlanDesdeRespuesta(empresas),
    empresasNombre: empresasNombreDesdeRespuesta(empresas),
  }
}

export function mensajeErrorUsuario(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback
  const message = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' ? message : fallback
}
