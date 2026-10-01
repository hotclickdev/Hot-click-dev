export { destinoPostLogin } from '@/utils/authRedirect'

type AuthErrorBody = {
  response?: { data?: { message?: unknown }; status?: number }
}

/**
 * Mensaje de error de API, o fallback si no viene string.
 */
export function mensajeErrorAuth(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback
  const message = (err as AuthErrorBody).response?.data?.message
  return typeof message === 'string' ? message : fallback
}

export function statusErrorAuth(err: unknown): number | undefined {
  if (!err || typeof err !== 'object' || !('response' in err)) return undefined
  return (err as AuthErrorBody).response?.status
}

/** "a••••s@gmail.com": deja ver solo la primera y la última letra antes de la arroba (Figma `44:1690`). */
export function correoEnmascarado(correo: string): string {
  const [local, dominio] = correo.trim().split('@')
  if (!local || !dominio) return correo
  if (local.length <= 2) return `${local[0]}••••@${dominio}`
  return `${local[0]}••••${local[local.length - 1]}@${dominio}`
}
