/**
 * Rangos del selector de presupuesto de «Te lo conseguimos» (decisión D12, 2-oct-2026; Figma `28:1486`).
 *
 * ⚠ VALORES PROVISIONALES — confirmar con el negocio. Montos en colones.
 * Para cambiarlos, editar solo esta lista. `hasta: null` es el último tramo («Más de …»).
 * Además de los rangos, el formulario ofrece «Otro monto» con texto libre.
 */
export type RangoPresupuesto = { id: string; desde: number; hasta: number | null }

export const RANGOS_PRESUPUESTO: readonly RangoPresupuesto[] = [
  { id: 'r1', desde: 0, hasta: 10_000 },
  { id: 'r2', desde: 10_000, hasta: 25_000 },
  { id: 'r3', desde: 25_000, hasta: 50_000 },
  { id: 'r4', desde: 50_000, hasta: 100_000 },
  { id: 'r5', desde: 100_000, hasta: null },
]

export const RANGOS_PRESUPUESTO_PROVISIONALES = true
