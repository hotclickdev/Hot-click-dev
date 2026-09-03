export type PasoFormulario = Readonly<{
  id: string
  titulo: string
  opcional?: boolean
}>

/** Limita el índice al rango válido [0, total-1]. */
export function indicePasoValido(paso: number, total: number): number {
  if (total <= 0) return 0
  if (paso < 0) return 0
  if (paso >= total) return total - 1
  return paso
}

export function esUltimoPaso(paso: number, total: number): boolean {
  return total > 0 && paso >= total - 1
}

export function esPrimerPaso(paso: number): boolean {
  return paso <= 0
}

/** Etiqueta visible: "Paso 2 de 4". */
export function etiquetaProgreso(paso: number, total: number): string {
  const actual = indicePasoValido(paso, total) + 1
  return `Paso ${actual} de ${Math.max(total, 1)}`
}

/**
 * Decide el siguiente índice tras Continuar.
 * Si hay error de validación, no avanza.
 */
export function siguientePasoSiValido(
  paso: number,
  total: number,
  errorValidacion: string | null,
): number {
  if (errorValidacion) return paso
  if (esUltimoPaso(paso, total)) return paso
  return paso + 1
}

export function pasoAnterior(paso: number): number {
  return Math.max(0, paso - 1)
}
