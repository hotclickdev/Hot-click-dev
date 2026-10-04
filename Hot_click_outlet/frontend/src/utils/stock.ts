/**
 * Tope de cantidad por stock (decisión R4, 2-oct-2026): se usa el stock real siempre que se conoce.
 * 99 es solo el respaldo cuando el dato no llegó (null/undefined). Un 0 real es agotado, no «desconocido».
 */
export const STOCK_DESCONOCIDO = 99

export function topeStock(stock: number | null | undefined): number {
  return stock ?? STOCK_DESCONOCIDO
}
