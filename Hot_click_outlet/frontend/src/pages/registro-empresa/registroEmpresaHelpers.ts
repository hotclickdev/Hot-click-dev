import type { AuthResponse } from '@/types/auth'

export type PerkRegistro = { id: string; title: string; desc: string }

/**
 * Beneficios del panel izquierdo (solo etiquetas; íconos en registroEmpresaIcons).
 */
export const PERKS: PerkRegistro[] = [
  { id: 'panel', title: 'Panel de ventas en tiempo real', desc: 'Pedidos, ingresos y estadísticas actualizados' },
  { id: 'pagos', title: 'Pagos con tarjeta y SINPE', desc: 'Recibí pagos seguros sin configurar nada extra' },
  { id: 'logistica', title: 'Logística integrada', desc: 'Coordiná envíos a todo Costa Rica desde el admin' },
  { id: 'soporte', title: 'Soporte dedicado 7 días', desc: 'Equipo disponible por WhatsApp cuando lo necesitás' },
]

export type StatRegistro = { n: string; s: string }

/**
 * Cifras destacadas del panel izquierdo.
 */
export const STATS: StatRegistro[] = [
  { n: '0 ₡', s: 'Alta del plan Emprendedor' },
  { n: 'SINPE', s: 'Y tarjeta en checkout' },
  { n: 'CR', s: 'Envío a todo el país' },
]

/** Longitud mínima de la contraseña de administrador (alineada con el backend). */
export const MIN_PASSWORD = 8

export type RegistroEmpresaForm = {
  nombreEmpresa: string
  correoEmpresa: string
  telefonoEmpresa: string
  nombreAdmin: string
  correoAdmin: string
  passwordAdmin: string
  telefonoAdmin: string
  inscritoTributacion: boolean
}

export type AuthRegistroEmpresa = AuthResponse & { otpEnviado?: boolean }

/**
 * Extrae AuthResponse del body ya desempaquetado por el interceptor de api
 * (ResponseDTO.data) o de un envelope anidado residual.
 */
export function authDataRegistroEmpresa(data: unknown): AuthRegistroEmpresa | undefined {
  if (!data || typeof data !== 'object') return undefined
  const envelope = data as { data?: AuthRegistroEmpresa; accessToken?: string }
  if (envelope.data?.accessToken) return envelope.data
  if (envelope.accessToken) return envelope as AuthRegistroEmpresa
  return undefined
}

/**
 * Variante de entrada para Framer Motion con delay por índice.
 */
export function stagger(i: number) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: 0.08 + i * 0.1, ease: [0.16, 1, 0.3, 1] as const },
  }
}

/** Transición horizontal entre pasos del formulario. */
export const STEP_MOTION = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.2 },
}
