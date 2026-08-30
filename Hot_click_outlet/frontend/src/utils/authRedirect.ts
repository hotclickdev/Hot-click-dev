/**
 * Destino seguro post-login: solo rutas relativas internas.
 */
export function destinoPostLogin(from: unknown): string {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'
}

/**
 * Login con retorno. Query sobrevive un refresh; `destinoPostLogin` evita open redirect.
 */
export function rutaLoginConRetorno(from: unknown): string {
  const dest = destinoPostLogin(from)
  if (dest === '/' || dest === '/login') return '/login'
  return `/login?redirect=${encodeURIComponent(dest)}`
}
