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

/**
 * M-01: precio unitario que cobra el backend (OrderPricingService.precioEfectivo).
 * Usa `precioEfectivo` del JSON si viene; si no, la misma regla:
 * oferta activa y 0 < precioOferta < precioVenta; si no, precio normal.
 */
export function precioUnitarioEfectivo(item: {
  precio?: number | null
  precioVenta?: number | null
  enOferta?: boolean | null
  precioOferta?: number | null
  precioEfectivo?: number | null
}): number {
  const lista = item.precioVenta ?? item.precio ?? 0
  if (typeof item.precioEfectivo === 'number' && item.precioEfectivo > 0) return item.precioEfectivo
  const oferta = item.precioOferta
  if (item.enOferta === true && oferta != null && oferta > 0 && oferta < lista) return oferta
  return lista
}
