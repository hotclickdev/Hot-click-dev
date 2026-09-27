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
]

/** Qué ítem de la barra inferior queda marcado para la ruta actual. */
export function seccionActivaBarra(pathname: string): SeccionBarra | null {
  if (pathname === '/') return 'inicio'
  const coincidencia = PREFIJOS.find(([prefijo]) => pathname === prefijo || pathname.startsWith(`${prefijo}/`))
  return coincidencia ? coincidencia[1] : null
}
