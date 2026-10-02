/** True si el navegador declara que no hay red. Sin `navigator` (SSR, tests) se asume conectado. */
export function navegadorSinRed(nav: Pick<Navigator, 'onLine'> | undefined = globalThis.navigator): boolean {
  return nav ? nav.onLine === false : false
}

type ErrorDeRed = { code?: string; response?: unknown; message?: string }

/**
 * True si el error es de conexión del comprador (no hubo respuesta del servidor), a diferencia
 * de `esFalloServidor` (la API respondió 5xx). Sin red del navegador, cualquier error cuenta.
 */
export function esSinConexion(error: unknown, nav?: Pick<Navigator, 'onLine'>): boolean {
  if (navegadorSinRed(nav)) return true
  if (!error || typeof error !== 'object') return false
  const e = error as ErrorDeRed
  if (e.response) return false
  return e.code === 'ERR_NETWORK' || e.message === 'Network Error'
}
