/** Tarifas de Claude (USD por millón de tokens) tal como las manda el backend (ClaudePrecios, ia.precio.*). */
export type TarifaIa = {
  modelo: string
  inputPorM: number
  outputPorM: number
  cacheLecturaPorM: number
  cacheEscrituraPorM: number
}

const MODELOS: ReadonlyArray<[string, string]> = [
  ['principal', 'Haiku 4.5 (asistente)'],
  ['sonnet46', 'Sonnet 4.6 (incidentes)'],
]
const CAMPOS = ['inputPorM', 'outputPorM', 'cacheLecturaPorM', 'cacheEscrituraPorM'] as const

function finito(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0
}

/** Lee `tarifasUsdPorMillon` del dashboard. Sin datos válidos no inventa precios: omite el modelo. */
export function leerTarifas(data: unknown): TarifaIa[] {
  const raiz = (data as { tarifasUsdPorMillon?: unknown } | null)?.tarifasUsdPorMillon
  if (!raiz || typeof raiz !== 'object') return []
  const salida: TarifaIa[] = []
  for (const [clave, modelo] of MODELOS) {
    const t = (raiz as Record<string, unknown>)[clave] as Record<string, unknown> | undefined
    if (!t || !CAMPOS.every((c) => finito(t[c]))) continue
    salida.push({
      modelo,
      inputPorM: t.inputPorM as number,
      outputPorM: t.outputPorM as number,
      cacheLecturaPorM: t.cacheLecturaPorM as number,
      cacheEscrituraPorM: t.cacheEscrituraPorM as number,
    })
  }
  return salida
}
