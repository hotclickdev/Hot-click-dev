/**
 * Detalle de Descubrí: producto o empresa → PDP en HotClick, no un sitio ajeno.
 */
export function destinoDetalleDescubri(top, remaining = []) {
  if (!top) return '/productos'
  if (top._tipo === 'info') return '/nosotros'
  if (top._tipo === 'empresa') {
    const producto = remaining.find((p) => !p._tipo && p.empresaSlug === top.slug)
    return producto ? `/productos/${producto.id}` : '/productos'
  }
  return `/productos/${top.id}`
}
