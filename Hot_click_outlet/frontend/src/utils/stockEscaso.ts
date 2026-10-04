/**
 * Regla única de «Quedan N» (decisión del 3-oct-2026, 13:55 CR): se avisa con 5 unidades o menos en ficha,
 * tarjeta, tienda, talla, filtro «Quedan pocos», wishlist y recuperar carrito. Con más de 5, «Disponible»; con 0, «Agotado».
 */
export const STOCK_QUEDAN_MAX = 5

/** `true` si hay stock y es de 1 a {@link STOCK_QUEDAN_MAX} unidades. */
export function quedanPocos(stock: number | null | undefined): boolean {
  return stock != null && stock > 0 && stock <= STOCK_QUEDAN_MAX
}
