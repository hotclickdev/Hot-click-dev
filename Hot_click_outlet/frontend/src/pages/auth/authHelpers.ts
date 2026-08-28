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
