import { esRutaEmprender } from '@/utils/emprendimientoRutas'

/**
 * Pestañas de la barra móvil. Misma IA que el header: Comprar / Vender / Emprender.
 * Pedido y Cuenta quedan para cerrar la compra. Descubrí e Inicio no se borran: viven en home y menú.
 * @param {{ t: (key: string) => string, token: string | null, cartBadge: string | null }} args
 */
export function itemsBottomNav({ t, token, cartBadge }) {
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
 * @param {{ activo?: (pathname: string) => boolean, prefixes?: string[], href: string }} item
 * @param {string} pathname
 */
export function estaTabActiva(item, pathname) {
  if (item.activo) return item.activo(pathname)
  if (item.prefixes) {
    return item.prefixes.some((prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`))
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
