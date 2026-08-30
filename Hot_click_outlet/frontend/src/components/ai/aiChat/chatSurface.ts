export type AiChatSurface = 'home' | 'catalogo' | 'producto' | 'carrito' | 'otra'

/**
 * Conversaciones distintas por superficie. El comportamiento va en cookie, no acá.
 */
export function sessionKeyFromPath(pathname?: string) {
  const path = pathname || '/'
  const ficha = path.match(/^\/productos\/([^/]+)/)
  if (ficha) return `producto-${ficha[1]}`
  if (path.startsWith('/productos')) return 'tienda-catalogo'
  if (path.startsWith('/carrito')) return 'hotclick-cart'
  return 'tienda-home'
}

export function surfaceFromSessionKey(sessionKey?: string): AiChatSurface {
  if (sessionKey === 'hotclick' || sessionKey === 'tienda-home') return 'home'
  if (sessionKey === 'tienda-catalogo') return 'catalogo'
  if (sessionKey?.startsWith('producto-')) return 'producto'
  if (sessionKey?.startsWith('hotclick-cart')) return 'carrito'
  return 'otra'
}

export function surfaceFromPath(pathname?: string): AiChatSurface {
  const path = pathname || '/'
  if (/^\/productos\/[^/]+/.test(path)) return 'producto'
  if (path.startsWith('/productos')) return 'catalogo'
  if (path.startsWith('/carrito')) return 'carrito'
  if (path === '/' || path.startsWith('/descubri')) return 'home'
  return 'otra'
}
