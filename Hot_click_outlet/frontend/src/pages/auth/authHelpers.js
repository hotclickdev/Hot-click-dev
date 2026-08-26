export { destinoPostLogin } from '@/utils/authRedirect'

/**
 * Mensaje de error de API, o fallback si no viene string.
 * @param {{ response?: { data?: { message?: unknown } } }} err
 * @param {string} fallback
 * @returns {string}
 */
export function mensajeErrorAuth(err, fallback) {
  const message = err.response?.data?.message
  return typeof message === 'string' ? message : fallback
}
