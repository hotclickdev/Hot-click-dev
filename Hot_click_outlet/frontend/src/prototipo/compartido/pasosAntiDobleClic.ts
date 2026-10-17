/** Pyme: «Guardar» aparece donde estaba «Continuar»; un doble clic guardaba sin revisar el último paso. */
export const ARMADO_FINAL_MS = 600

export function finalArmado(llegadaMs: number, ahoraMs: number): boolean {
  return ahoraMs - llegadaMs >= ARMADO_FINAL_MS
}
