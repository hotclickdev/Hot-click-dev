/** Salto del control de rango de precio, en colones. */
export const PASO_RANGO = 500

/** Tope del control: el precio más alto del catálogo, redondeado hacia arriba al salto. */
export function topeDeRango(precios: number[]): number {
  const maximo = precios.reduce((m, p) => (p > m ? p : m), 0)
  return Math.ceil(maximo / PASO_RANGO) * PASO_RANGO
}
