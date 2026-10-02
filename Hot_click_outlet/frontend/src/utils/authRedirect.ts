/** `//host` o `/\host` (el navegador trata `\` como `/`) llevan a otro sitio. */
const PREFIJO_EXTERNO = /^\/[/\\]/

/** Tab, saltos de línea y demás controles: el navegador los descarta al resolver la URL y pueden armar un `//host`. */
function tieneControl(texto: string): boolean {
  return [...texto].some((c) => {
    const codigo = c.codePointAt(0) ?? 0
    return codigo < 0x20 || codigo === 0x7f
  })
}

/**
 * Destino seguro post-login: solo rutas relativas internas.
 */
export function destinoPostLogin(from: unknown): string {
  return typeof from === 'string' && from.startsWith('/') && !PREFIJO_EXTERNO.test(from) && !tieneControl(from) ? from : '/'
}

/**
 * Login con retorno. Query sobrevive un refresh; `destinoPostLogin` evita open redirect.
 */
export function rutaLoginConRetorno(from: unknown): string {
  const dest = destinoPostLogin(from)
  if (dest === '/' || dest === '/login') return '/login'
  return `/login?redirect=${encodeURIComponent(dest)}`
}
