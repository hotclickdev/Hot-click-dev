import type { Producto } from '@/types/producto'
import { esProductoCotizable, tieneOfertaActiva } from '@/utils/precioProducto'

/** Hasta este stock se muestra el badge “Quedan N” de la tarjeta (`5:26`). */
export const STOCK_ESCASO_MAX = 5

export function stockEscaso(product: Pick<Producto, 'stock'>): number | null {
  const stock = product.stock
  if (stock == null || stock <= 0 || stock > STOCK_ESCASO_MAX) return null
  return stock
}

export function nombreVendedor(product: Partial<Pick<Producto, 'empresaNombre' | 'bodegaNombre'>>): string {
  return product.empresaNombre?.trim() || product.bodegaNombre?.trim() || 'HotClick'
}

export function fotoProducto(product: Partial<Pick<Producto, 'imagenUrl' | 'imagenPrincipalUrl'>>): string | null {
  return product.imagenUrl || product.imagenPrincipalUrl || null
}

type ProductoTarjeta = Pick<Producto, 'stock' | 'precio' | 'precioOferta' | 'esPersonalizado' | 'modoPrecioPersonalizado'>

/**
 * Agotado: sin stock y que no sea un producto a cotizar (esos se piden a la
 * medida y su stock no limita la compra, igual que en el catálogo anterior).
 */
export function tarjetaAgotada(product: Partial<ProductoTarjeta>): boolean {
  return product.stock === 0 && !esProductoCotizable(product)
}

export type InsigniaTarjeta =
  | { tipo: 'hechoAPedido' }
  | { tipo: 'quedan'; cantidad: number }
  | { tipo: 'oferta' }

/**
 * Una sola insignia sobre la foto (Figma `5:26`: “Quedan N” y “Hecho a pedido”
 * comparten el mismo lugar). Prioridad: Hecho a pedido, Quedan N, Oferta.
 * Un producto agotado no lleva insignia.
 */
export function insigniaTarjeta(product: Partial<ProductoTarjeta>): InsigniaTarjeta | null {
  if (tarjetaAgotada(product)) return null
  if (product.esPersonalizado === true) return { tipo: 'hechoAPedido' }
  const cantidad = product.stock == null ? null : stockEscaso({ stock: product.stock })
  if (cantidad != null) return { tipo: 'quedan', cantidad }
  if (tieneOfertaActiva(product)) return { tipo: 'oferta' }
  return null
}

/** Precio de lista que se muestra tachado junto al de oferta; `null` si no hay oferta activa. */
export function precioListaTachado(product: Partial<ProductoTarjeta>): number | null {
  if (tarjetaAgotada(product) || !tieneOfertaActiva(product)) return null
  return product.precio ?? null
}

/** Monto mínimo de un producto a precio por rango (“Desde ₡X”); `null` en los demás casos. */
export function precioDesde(product: Partial<Pick<Producto, 'esPersonalizado' | 'modoPrecioPersonalizado' | 'precioPersonalizadoMin' | 'precioPersonalizadoMax'>>): number | null {
  if (product.esPersonalizado !== true || product.modoPrecioPersonalizado !== 'RANGO') return null
  if (product.precioPersonalizadoMin == null || product.precioPersonalizadoMax == null) return null
  return product.precioPersonalizadoMin
}
