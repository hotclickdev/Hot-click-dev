import { formatPrice } from './format'

export function esProductoCotizable(product: {
  esPersonalizado?: boolean
  modoPrecioPersonalizado?: string | null
}): boolean {
  return product.esPersonalizado === true && product.modoPrecioPersonalizado !== 'FIJO'
}

export function textoPrecioProducto(product: {
  esPersonalizado?: boolean
  modoPrecioPersonalizado?: string | null
  precio?: number
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
  return formatPrice(product.precio)
}
