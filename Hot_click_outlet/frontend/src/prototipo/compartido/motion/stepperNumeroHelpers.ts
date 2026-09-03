/** Paso típico de precios en colones enteros (CRC). */
export const PASO_COLONES = 100

/** Ajusta un string numérico entero por `delta`, sin bajar de `minimo`. */
export function ajustarEnteroString(valor: string, delta: number, minimo = 0): string {
  const parseado = Number.parseInt(valor, 10)
  const base = Number.isFinite(parseado) ? parseado : 0
  return String(Math.max(minimo, base + delta))
}
