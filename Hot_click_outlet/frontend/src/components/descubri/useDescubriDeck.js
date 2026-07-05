import { useCallback, useEffect, useRef, useState } from 'react'
import { productService } from '@/services/productService'

// Perfil de gustos persistente por navegador: puntajes por categoría/marca/precio
// y el historial de qué producto se deslizó hacia dónde.
const LS_KEY = 'hotclick-descubri-gustos'
const DECAY = 0.9         // los gustos viejos pierden fuerza en cada visita
const SCORE_CAP = 30      // evita que una categoría domine para siempre
const MAX_SEEN = 500

// Bandas de precio para el scoring (₡ enteros)
const priceBand = (precio) => {
  if (precio < 10000) return 'b1'
  if (precio < 25000) return 'b2'
  if (precio < 50000) return 'b3'
  return 'b4'
}

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Pesos: un like pesa más que un descarte para que el mazo converja
// hacia lo que gusta sin castigar de más una categoría por un solo "paso".
const W_LIKE = { cat: 3, marca: 2, band: 1 }
const W_SKIP = { cat: -1, marca: -1, band: 0 }

const loadPerfil = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
    const scores = new Map()
    for (const [k, v] of Object.entries(raw.scores ?? {})) {
      const decayed = Math.round(v * DECAY * 10) / 10
      if (Math.abs(decayed) >= 0.5) scores.set(k, decayed)
    }
    return { scores, seen: raw.seen ?? {} }
  } catch {
    return { scores: new Map(), seen: {} }
  }
}

const savePerfil = (scores, seen) => {
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

export default function useDescubriDeck() {
  const [status, setStatus] = useState('loading') // loading | ready | done | error
  const [remaining, setRemaining] = useState([])
  const [liked, setLiked] = useState([])
  const [total, setTotal] = useState(0)
  // El mazo vive en un ref y el estado es un espejo: así los setters reciben
  // valores ya calculados (updaters puros) y los efectos colaterales
  // (scores, history, persistencia) corren exactamente una vez por swipe.
  const deckRef = useRef([])
  const scores = useRef(new Map())
  const seen = useRef({})
  const history = useRef([])

  const affinity = (p) => {
    const s = scores.current
    return (
      (s.get(`c:${p.categoriaId}`) ?? 0) +
      (s.get(`m:${p.marcaId}`) ?? 0) +
      (s.get(`b:${priceBand(p.precio)}`) ?? 0)
    )
  }

  const bump = (key, delta) => {
    if (/(null|undefined|:)$/.test(key)) return
    const next = (scores.current.get(key) ?? 0) + delta
    scores.current.set(key, Math.max(-SCORE_CAP, Math.min(SCORE_CAP, next)))
  }

  // Orden del mazo: lo no visto afín a sus gustos primero;
  // lo ya guardado después; lo que descartó antes, de último.
  const ordenar = (items) => {
    const grupo = (p) => {
      const accion = seen.current[p.id]
      if (accion === 'skip') return 2
      if (accion === 'like') return 1
      return 0
    }
    return [...items].sort(
      (a, b) => grupo(a) - grupo(b) || affinity(b) - affinity(a) || a._base - b._base
    )
  }

  const load = useCallback(() => {
    setStatus('loading')
    const perfil = loadPerfil()
    scores.current = perfil.scores
    seen.current = perfil.seen
    history.current = []
    setLiked([])
    productService
      .getAll(0, 100)
      .then(({ data }) => {
        const items = shuffle(
          (data?.content ?? []).filter((p) => p.imagenUrl && p.stock > 0)
        ).map((p, i) => ({ ...p, _base: i }))
        const ordenados = ordenar(items)
        deckRef.current = ordenados
        setRemaining(ordenados)
        setTotal(ordenados.length)
        setStatus(ordenados.length > 0 ? 'ready' : 'error')
        savePerfil(scores.current, seen.current) // persiste el decay aplicado
      })
      .catch(() => setStatus('error'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const swipe = useCallback((dir) => {
    const [top, ...rest] = deckRef.current
    if (!top) return
    const w = dir === 'like' ? W_LIKE : W_SKIP
    bump(`c:${top.categoriaId}`, w.cat)
    bump(`m:${top.marcaId}`, w.marca)
    bump(`b:${priceBand(top.precio)}`, w.band)
    history.current.push({ product: top, dir, prevSeen: seen.current[top.id] })
    seen.current[top.id] = dir
    savePerfil(scores.current, seen.current)
    // Reordena lo que queda según la afinidad acumulada
    const sorted = ordenar(rest)
    deckRef.current = sorted
    setRemaining(sorted)
    if (dir === 'like') setLiked((l) => (l.some((p) => p.id === top.id) ? l : [...l, top]))
    if (sorted.length === 0) setStatus('done')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const undo = useCallback(() => {
    const last = history.current.pop()
    if (!last) return
    const w = last.dir === 'like' ? W_LIKE : W_SKIP
    bump(`c:${last.product.categoriaId}`, -w.cat)
    bump(`m:${last.product.marcaId}`, -w.marca)
    bump(`b:${priceBand(last.product.precio)}`, -w.band)
    if (last.prevSeen === undefined) delete seen.current[last.product.id]
    else seen.current[last.product.id] = last.prevSeen
    savePerfil(scores.current, seen.current)
    if (last.dir === 'like') setLiked((l) => l.filter((p) => p.id !== last.product.id))
    deckRef.current = [last.product, ...deckRef.current]
    setRemaining(deckRef.current)
    setStatus('ready')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    remaining,
    liked,
    total,
    seen: total - remaining.length,
    canUndo: history.current.length > 0,
    swipe,
    undo,
    restart: load,
  }
}
