/** Precio y CTA de productos en chats asesores (SSE + RAG). */

export type ModoPrecioChat = 'FIJO' | 'RANGO' | 'COTIZACION' | string | null | undefined

export type ProductoPrecioChat = {
  precio?: number | null
  precioOferta?: number | null
  esPersonalizado?: boolean | null
  modoPrecioPersonalizado?: ModoPrecioChat
  precioPersonalizadoMin?: number | null
  precioPersonalizadoMax?: number | null
  precioEtiqueta?: string | null
}

const fmt = (n: number) => new Intl.NumberFormat('es-CR').format(n)

/** Cotización/rango: ir a ficha, no al carrito. */
export function requiereFichaEncargo(p: ProductoPrecioChat): boolean {
  return p.esPersonalizado === true && p.modoPrecioPersonalizado !== 'FIJO'
}

export function etiquetaPrecioChat(p: ProductoPrecioChat): string {
  if (p.precioEtiqueta && p.precioEtiqueta.trim()) return p.precioEtiqueta.trim()
  if (p.esPersonalizado && p.modoPrecioPersonalizado === 'COTIZACION') return 'A cotizar'
  if (p.esPersonalizado && p.modoPrecioPersonalizado === 'RANGO') {
    const min = p.precioPersonalizadoMin
    const max = p.precioPersonalizadoMax
    if (min != null && min > 0 && max != null && max > 0) {
      return `Desde ₡${fmt(min)} hasta ₡${fmt(max)}`
    }
    if (min != null && min > 0) return `Desde ₡${fmt(min)}`
    return 'A cotizar'
  }
  const oferta = p.precioOferta
  const venta = p.precio
  if (oferta != null && oferta > 0) return `₡${fmt(oferta)}`
  if (venta != null && venta > 0) return `₡${fmt(venta)}`
  return 'A cotizar'
}
