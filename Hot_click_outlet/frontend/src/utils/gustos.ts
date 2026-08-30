// Perfil de gustos del visitante, aprendido en Descubrí y persistido por navegador.
// Lo consumen el mazo de swipe y el orden "Según tus gustos" del catálogo.

import type { Producto } from '@/types/producto'

export const LS_KEY = 'hotclick-descubri-gustos'

const DECAY = 0.9         // los gustos viejos pierden fuerza en cada visita al mazo
const MAX_SEEN = 500

type GustosSeen = Record<string, unknown>
type GustosScores = Map<string, number>

// Bandas de precio para el scoring (₡ enteros)
export const priceBand = (precio: number) => {
  if (precio < 10000) return 'b1'
  if (precio < 25000) return 'b2'
  if (precio < 50000) return 'b3'
  return 'b4'
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

/**
 * Carga el perfil. Con decay=true (solo el mazo) los puntajes se atenúan;
 * las lecturas de solo consulta (catálogo) no deben mutar el perfil.
 */
export function loadGustos({ decay = false }: { decay?: boolean } = {}) {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
    const raw = asRecord(parsed)
    const scores: GustosScores = new Map()
    for (const [k, v] of Object.entries(asRecord(raw.scores))) {
      const num = typeof v === 'number' ? v : Number(v)
      if (!Number.isFinite(num)) continue
      const val = decay ? Math.round(num * DECAY * 10) / 10 : num
      if (Math.abs(val) >= 0.5) scores.set(k, val)
    }
    return { scores, seen: asRecord(raw.seen) as GustosSeen }
  } catch {
    return { scores: new Map<string, number>(), seen: {} as GustosSeen }
  }
}

export function saveGustos(scores: GustosScores, seen: GustosSeen) {
  try {
    const ids = Object.keys(seen)
    if (ids.length > MAX_SEEN) {
      for (const id of ids.slice(0, ids.length - MAX_SEEN)) delete seen[id]
    }
    localStorage.setItem(LS_KEY, JSON.stringify({
      scores: Object.fromEntries(scores),
      seen,
      updatedAt: Date.now(),
    }))
  } catch { /* almacenamiento lleno o bloqueado: la sesión sigue sin persistir */ }
}

/** Afinidad de un producto (ya normalizado) con el perfil. */
export function affinityOf(
  p: Pick<Producto, 'categoriaId' | 'marcaId' | 'precio'>,
  scores: GustosScores,
) {
  return (
    (scores.get(`c:${p.categoriaId}`) ?? 0) +
    (scores.get(`m:${p.marcaId}`) ?? 0) +
    (scores.get(`b:${priceBand(p.precio)}`) ?? 0)
  )
}

/** true si el visitante ya tiene gustos aprendidos. */
export function hasGustos() {
  return loadGustos().scores.size > 0
}
