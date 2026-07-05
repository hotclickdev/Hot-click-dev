import { useCallback, useEffect, useRef, useState } from 'react'
import { productService } from '@/services/productService'

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

export default function useDescubriDeck() {
  const [status, setStatus] = useState('loading') // loading | ready | done | error
  const [remaining, setRemaining] = useState([])
  const [liked, setLiked] = useState([])
  const [total, setTotal] = useState(0)
  // El mazo vive en un ref y el estado es un espejo: así los setters reciben
  // valores ya calculados (updaters puros) y los efectos colaterales
  // (scores, history) corren exactamente una vez por swipe.
  const deckRef = useRef([])
  const scores = useRef(new Map())
  const history = useRef([])

  const load = useCallback(() => {
    setStatus('loading')
    scores.current = new Map()
    history.current = []
    setLiked([])
    productService
      .getAll(0, 100)
      .then(({ data }) => {
        const items = shuffle(
          (data?.content ?? []).filter((p) => p.imagenUrl && p.stock > 0)
        ).map((p, i) => ({ ...p, _base: i }))
        deckRef.current = items
        setRemaining(items)
        setTotal(items.length)
        setStatus(items.length > 0 ? 'ready' : 'error')
      })
      .catch(() => setStatus('error'))
  }, [])

  useEffect(() => { load() }, [load])

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
    scores.current.set(key, (scores.current.get(key) ?? 0) + delta)
  }

  const swipe = useCallback((dir) => {
    const [top, ...rest] = deckRef.current
    if (!top) return
    const w = dir === 'like' ? W_LIKE : W_SKIP
    bump(`c:${top.categoriaId}`, w.cat)
    bump(`m:${top.marcaId}`, w.marca)
    bump(`b:${priceBand(top.precio)}`, w.band)
    history.current.push({ product: top, dir })
    // Reordena lo que queda según la afinidad acumulada de la sesión
    const sorted = [...rest].sort(
      (a, b) => affinity(b) - affinity(a) || a._base - b._base
    )
    deckRef.current = sorted
    setRemaining(sorted)
    if (dir === 'like') setLiked((l) => (l.some((p) => p.id === top.id) ? l : [...l, top]))
    if (sorted.length === 0) setStatus('done')
  }, [])

  const undo = useCallback(() => {
    const last = history.current.pop()
    if (!last) return
    const w = last.dir === 'like' ? W_LIKE : W_SKIP
    bump(`c:${last.product.categoriaId}`, -w.cat)
    bump(`m:${last.product.marcaId}`, -w.marca)
    bump(`b:${priceBand(last.product.precio)}`, -w.band)
    if (last.dir === 'like') setLiked((l) => l.filter((p) => p.id !== last.product.id))
    deckRef.current = [last.product, ...deckRef.current]
    setRemaining(deckRef.current)
    setStatus('ready')
  }, [])

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
