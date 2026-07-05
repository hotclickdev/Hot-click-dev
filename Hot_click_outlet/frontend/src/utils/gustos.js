// Perfil de gustos del visitante, aprendido en Descubrí y persistido por navegador.
// Lo consumen el mazo de swipe y el orden "Según tus gustos" del catálogo.

export const LS_KEY = 'hotclick-descubri-gustos'

const DECAY = 0.9         // los gustos viejos pierden fuerza en cada visita al mazo
const MAX_SEEN = 500

// Bandas de precio para el scoring (₡ enteros)
export const priceBand = (precio) => {
  if (precio < 10000) return 'b1'
  if (precio < 25000) return 'b2'
  if (precio < 50000) return 'b3'
  return 'b4'
}

/**
 * Carga el perfil. Con decay=true (solo el mazo) los puntajes se atenúan;
 * las lecturas de solo consulta (catálogo) no deben mutar el perfil.
 */
export function loadGustos({ decay = false } = {}) {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
    const scores = new Map()
    for (const [k, v] of Object.entries(raw.scores ?? {})) {
      const val = decay ? Math.round(v * DECAY * 10) / 10 : v
      if (Math.abs(val) >= 0.5) scores.set(k, val)
    }
    return { scores, seen: raw.seen ?? {} }
  } catch {
    return { scores: new Map(), seen: {} }
  }
}

export function saveGustos(scores, seen) {
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
export function affinityOf(p, scores) {
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
