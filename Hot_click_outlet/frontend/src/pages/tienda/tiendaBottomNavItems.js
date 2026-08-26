/**
 * Pestañas de la tienda del vendedor. No replica Comprar/Vender/Emprender del marketplace.
 * @param {string} slug
 * @param {number} cantidadCarrito
 */
export function itemsTiendaBottomNav(slug, cantidadCarrito) {
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

/**
 * @param {{ id: string }} item
 * @param {string} pathname
 * @param {string} slug
 */
export function estaTabTiendaActiva(item, pathname, slug) {
  const base = `/tienda/${slug}`
  if (item.id === 'catalogo') {
    return pathname === base || pathname.startsWith(`${base}/producto`)
  }
  if (item.id === 'pedido') {
    return pathname.startsWith(`${base}/carrito`) || pathname.startsWith(`${base}/checkout`)
  }
  return false
}
