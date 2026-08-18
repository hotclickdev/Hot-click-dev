/**
 * Conversaciones distintas por superficie. El comportamiento va en cookie, no acá.
 * @param {string} pathname
 * @returns {string}
 */
export function sessionKeyFromPath(pathname) {
  const path = pathname || '/'
  const ficha = path.match(/^\/productos\/([^/]+)/)
  if (ficha) return `producto-${ficha[1]}`
  if (path.startsWith('/productos')) return 'tienda-catalogo'
  if (path.startsWith('/carrito')) return 'hotclick-cart'
  return 'tienda-home'
}

/**
 * @param {string} sessionKey
 * @returns {'home'|'catalogo'|'producto'|'carrito'|'otra'}
 */
export function surfaceFromSessionKey(sessionKey) {
  if (sessionKey === 'hotclick' || sessionKey === 'tienda-home') return 'home'
  if (sessionKey === 'tienda-catalogo') return 'catalogo'
  if (sessionKey?.startsWith('producto-')) return 'producto'
  if (sessionKey?.startsWith('hotclick-cart')) return 'carrito'
  return 'otra'
}

/**
 * @param {string} pathname
 * @returns {'home'|'catalogo'|'producto'|'carrito'|'otra'}
 */
export function surfaceFromPath(pathname) {
  const path = pathname || '/'
  if (/^\/productos\/[^/]+/.test(path)) return 'producto'
  if (path.startsWith('/productos')) return 'catalogo'
  if (path.startsWith('/carrito')) return 'carrito'
  if (path === '/' || path.startsWith('/descubri')) return 'home'
  return 'otra'
}
