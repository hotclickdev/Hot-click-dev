import { esRutaEmprender } from '@/utils/emprendimientoRutas'

export type BottomNavItem = {
  id: string
  href: string
  label: string
  icon: string
  prefixes?: string[]
  activo?: (pathname: string) => boolean
  badge?: string | null
}

/**
 * Pestañas de la barra móvil. Misma IA que el header: Comprar / Vender / Emprender.
 * Pedido y Cuenta quedan para cerrar la compra. Descubrí e Inicio no se borran: viven en home y menú.
 */
export function itemsBottomNav({
  t,
  token,
  cartBadge,
}: {
  t: (key: string) => string
  token: string | null
  cartBadge: string | null
}): BottomNavItem[] {
  return [
    { id: 'comprar', href: '/productos', label: t('nav.comprar'), icon: 'comprar' },
    {
      id: 'vender',
      href: '/registro-empresa',
      label: t('nav.vender'),
      icon: 'vender',
      prefixes: ['/registro-empresa', '/registrar-negocio'],
    },
    {
      id: 'emprender',
      href: '/emprende',
      label: t('nav.emprender'),
      icon: 'emprender',
      activo: esRutaEmprender,
    },
    {
      id: 'pedido',
      href: '/carrito',
      label: t('bnav.pedido'),
      icon: 'pedido',
      badge: cartBadge,
      prefixes: ['/carrito'],
    },
    {
      id: 'cuenta',
      href: token ? '/mis-pedidos' : '/login',
      label: t('bnav.cuenta'),
      icon: 'cuenta',
      prefixes: token ? ['/mis-pedidos', '/perfil'] : ['/login'],
    },
  ]
}

/**
 * ¿La pestaña coincide con la ruta actual?
 */
export function estaTabActiva(item: BottomNavItem, pathname: string): boolean {
  if (item.activo) return item.activo(pathname)
  if (item.prefixes) {
    return item.prefixes.some((prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`))
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
