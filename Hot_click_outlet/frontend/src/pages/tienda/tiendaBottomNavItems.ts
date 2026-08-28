export type TabTiendaBottomNav = {
  id: string
  href: string
  label: string
  badge?: string | null
}

/**
 * Pestañas de la tienda del vendedor. No replica Comprar/Vender/Emprender del marketplace.
 */
export function itemsTiendaBottomNav(slug: string, cantidadCarrito: number): TabTiendaBottomNav[] {
  const base = `/tienda/${slug}`
  const badge = cantidadCarrito > 9 ? '9+' : `${cantidadCarrito}`
  return [
    { id: 'catalogo', href: base, label: 'Catálogo' },
    {
      id: 'pedido',
      href: `${base}/carrito`,
      label: 'Pedido',
      badge: cantidadCarrito > 0 ? badge : null,
    },
    { id: 'hotclick', href: '/', label: 'HotClick' },
  ]
}

export function estaTabTiendaActiva(item: { id: string }, pathname: string, slug: string): boolean {
  const base = `/tienda/${slug}`
  if (item.id === 'catalogo') {
    return pathname === base || pathname.startsWith(`${base}/producto`)
  }
  if (item.id === 'pedido') {
    return pathname.startsWith(`${base}/carrito`) || pathname.startsWith(`${base}/checkout`)
  }
  return false
}
