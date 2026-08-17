/**
 * Destino seguro post-login: solo rutas relativas internas.
 * @param {unknown} from
 * @returns {string}
 */
export function destinoPostLogin(from) {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'
}

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
