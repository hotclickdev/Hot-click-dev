import { formatPrice } from './format'

export function esProductoCotizable(product: {
  esPersonalizado?: boolean
  modoPrecioPersonalizado?: string | null
}): boolean {
  return product.esPersonalizado === true && product.modoPrecioPersonalizado !== 'FIJO'
}

/** Oferta activa: precioOferta menor que el precio de lista. */
export function tieneOfertaActiva(product: {
  esPersonalizado?: boolean
  modoPrecioPersonalizado?: string | null
  precio?: number
  precioOferta?: number | null
}): boolean {
  if (esProductoCotizable(product)) return false
  const oferta = product.precioOferta
  const lista = product.precio
  return oferta != null && oferta > 0 && lista != null && oferta < lista
}

export function textoPrecioProducto(product: {
  esPersonalizado?: boolean
  modoPrecioPersonalizado?: string | null
  precio?: number
  precioOferta?: number | null
  precioPersonalizadoMin?: number | null
  precioPersonalizadoMax?: number | null
}): string {
  if (product.esPersonalizado && product.modoPrecioPersonalizado === 'COTIZACION') return 'A cotizar'
  if (
    product.esPersonalizado
    && product.modoPrecioPersonalizado === 'RANGO'
    && product.precioPersonalizadoMin != null
    && product.precioPersonalizadoMax != null
  ) {
    return `Desde ${formatPrice(product.precioPersonalizadoMin)}`
  }
  if (tieneOfertaActiva(product) && product.precioOferta != null) {
    return formatPrice(product.precioOferta)
  }
  return formatPrice(product.precio)
}
