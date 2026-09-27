import type { Producto } from '@/types/producto'

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
