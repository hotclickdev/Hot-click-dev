export type SeccionBarra = 'inicio' | 'buscar' | 'categorias' | 'pedido' | 'cuenta'

const PREFIJOS: ReadonlyArray<[string, SeccionBarra]> = [
  ['/categorias', 'categorias'],
  ['/productos', 'buscar'],
  ['/buscar', 'buscar'],
  ['/carrito', 'pedido'],
  ['/checkout', 'pedido'],
  ['/perfil', 'cuenta'],
  ['/mis-pedidos', 'cuenta'],
  ['/wishlist', 'cuenta'],
  ['/login', 'cuenta'],
  ['/registro', 'cuenta'],
  ['/blog', 'inicio'],
  ['/sin-conexion', 'inicio'],
]

const coincidePrefijo = (pathname: string, prefijo: string) => pathname === prefijo || pathname.startsWith(`${prefijo}/`)

/**
 * Qué ítem de la barra inferior queda marcado para la ruta actual.
 * Dos casos dependen de la query: `/productos?cat=` es navegación por categoría (Figma `43:1530`) y
 * `/servicios?vista=solicitudes` es parte de Cuenta (Figma `29:1535`).
 */
export function seccionActivaBarra(pathname: string, search = ''): SeccionBarra | null {
  if (pathname === '/') return 'inicio'
  const params = new URLSearchParams(search)
  if (pathname === '/productos' && params.has('cat')) return 'categorias'
  if (pathname === '/servicios' && params.get('vista') === 'solicitudes') return 'cuenta'
  const coincidencia = PREFIJOS.find(([prefijo]) => coincidePrefijo(pathname, prefijo))
  return coincidencia ? coincidencia[1] : null
}
