/**
 * Destino seguro post-login: solo rutas relativas internas.
 * @param {unknown} from
 * @returns {string}
 */
export function destinoPostLogin(from) {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'
}

/**
 * Login con retorno. Query sobrevive un refresh; `destinoPostLogin` evita open redirect.
 * @param {unknown} from
 * @returns {string}
 */
export function rutaLoginConRetorno(from) {
  const dest = destinoPostLogin(from)
  if (dest === '/' || dest === '/login') return '/login'
  return `/login?redirect=${encodeURIComponent(dest)}`
}
