import { useCallback, useEffect, useRef, useState } from 'react'
import { productService } from '@/services/productService'
import { loadGustos, saveGustos, affinityOf, priceBand } from '@/utils/gustos'
import type { Producto } from '@/types/producto'
import type {
  CartaDescubri,
  CartaEspecialDescubri,
  CartaProductoDescubri,
  DescubriDeckApi,
  DirSwipeDescubri,
} from '@/pages/descubri/destinoDetalleDescubri'

const SCORE_CAP = 30      // evita que una categoría domine para siempre

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)) // NOSONAR — shuffle de UI, no crypto
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Pesos: un like pesa más que un descarte para que el mazo converja
// hacia lo que gusta sin castigar de más una categoría por un solo "paso".
const W_LIKE = { cat: 3, marca: 2, band: 1 }
const W_SKIP = { cat: -1, marca: -1, band: 0 }

// "Los mejores primero": empuje suave para destacados y ofertas.
// Decide el orden en frío (usuario sin gustos) y es marginal cuando
// ya hay afinidad acumulada (los scores llegan hasta ±30 por clave).
const boostDe = (p: CartaProductoDescubri) => (p.destacado ? 2.5 : 0) + (p.enOferta ? 1.5 : 0)

// Cartas especiales intercaladas en el mazo: info del negocio en posiciones
// fijas y presentación de cada emprendimiento antes de su primer producto.
// Nunca entran a scores/seen/liked ni a localStorage.
const INFO_VARIANTES = ['about', 'envios', 'pago']
const INFO_START = 4
const INFO_STEP = 8
const MAX_EMPRESAS = 3

type DeckStatus = 'loading' | 'ready' | 'done' | 'error'

type HistoryEspecial = { especial: CartaEspecialDescubri; dir: DirSwipeDescubri }
type HistoryProducto = { product: CartaProductoDescubri; dir: DirSwipeDescubri; prevSeen: unknown }
type HistoryItem = HistoryEspecial | HistoryProducto

const inyectarEspeciales = (ordenados: CartaProductoDescubri[]): CartaDescubri[] => {
  const mazo: CartaDescubri[] = [...ordenados]

  // 1) Emprendimientos: carta de presentación antes de su primer producto
  const vistos = new Set<string>()
  for (const p of ordenados) {
    if (!p.empresaSlug || vistos.has(p.empresaSlug)) continue
    if (vistos.size >= MAX_EMPRESAS) break
    vistos.add(p.empresaSlug)
    const pos = Math.max(mazo.indexOf(p), 1) // nunca la primerísima carta
    mazo.splice(pos, 0, {
      _tipo: 'empresa',
      id: `sp-emp-${p.empresaSlug}`,
      slug: p.empresaSlug,
      nombre: p.empresaNombre,
    })
  }

  // 2) Info del negocio en posiciones fijas (solo si el mazo llega hasta ahí)
  INFO_VARIANTES.forEach((variante, k) => {
    let pos = INFO_START + k * INFO_STEP + k // +k compensa las info previas
    // Evita dos especiales adyacentes: ambos vecinos deben ser productos
    while (pos < mazo.length && (mazo[pos]?._tipo || mazo[pos - 1]?._tipo)) pos += 1
    if (pos >= mazo.length) return
    mazo.splice(pos, 0, { _tipo: 'info', id: `sp-info-${variante}`, variante })
  })

  return mazo
}

export default function useDescubriDeck(): DescubriDeckApi {
  const [status, setStatus] = useState<DeckStatus>('loading') // loading | ready | done | error
  const [remaining, setRemaining] = useState<CartaDescubri[]>([])
  const [liked, setLiked] = useState<CartaProductoDescubri[]>([])
  const [total, setTotal] = useState(0)
  // El mazo vive en un ref y el estado es un espejo: así los setters reciben
  // valores ya calculados (updaters puros) y los efectos colaterales
  // (scores, history, persistencia) corren exactamente una vez por swipe.
  const deckRef = useRef<CartaDescubri[]>([])
  const scores = useRef(new Map<string, number>())
  const seen = useRef<Record<string, unknown>>({})
  const history = useRef<HistoryItem[]>([])

  const bump = (key: string, delta: number) => {
    if (/(null|undefined|:)$/.test(key)) return
    const next = (scores.current.get(key) ?? 0) + delta
    scores.current.set(key, Math.max(-SCORE_CAP, Math.min(SCORE_CAP, next)))
  }

  // Orden del mazo: lo no visto afín a sus gustos primero;
  // lo ya guardado después; lo que descartó antes, de último.
  const ordenar = (items: CartaProductoDescubri[]) => {
    const grupo = (p: CartaProductoDescubri) => {
      const accion = seen.current[String(p.id)]
      if (accion === 'skip') return 2
      if (accion === 'like') return 1
      return 0
    }
    return [...items].sort(
      (a, b) =>
        grupo(a) - grupo(b) ||
        affinityOf(b, scores.current) + boostDe(b) - (affinityOf(a, scores.current) + boostDe(a)) ||
        (a._base ?? 0) - (b._base ?? 0)
    )
  }

  // Reordena solo los productos y reinserta cada especial en su offset:
  // así el re-sort por swipe no las desplaza de su posición en el mazo.
  const ordenarConEspeciales = (items: CartaDescubri[]) => {
    const especiales: { card: CartaEspecialDescubri; idx: number }[] = []
    const productos: CartaProductoDescubri[] = []
    items.forEach((it, idx) => (it._tipo ? especiales.push({ card: it, idx }) : productos.push(it)))
    const sorted: CartaDescubri[] = ordenar(productos)
    especiales.forEach(({ card, idx }) => sorted.splice(Math.min(idx, sorted.length), 0, card))
    return sorted
  }

  const load = useCallback(() => {
    setStatus('loading')
    const perfil = loadGustos({ decay: true })
    scores.current = perfil.scores
    seen.current = perfil.seen
    history.current = []
    setLiked([])
    productService
      .getAll(0, 100)
      .then(({ data }) => {
        const pagina = data as { content?: Producto[] }
        const items = shuffle(
          (pagina?.content ?? []).filter((p) => p.imagenUrl && p.stock > 0)
        ).map((p, i) => ({ ...p, _base: i }))
        // Nota: getAll(0, 100) — con más de 100 productos habría que paginar
        const mazo = inyectarEspeciales(ordenar(items))
        deckRef.current = mazo
        setRemaining(mazo)
        setTotal(mazo.length)
        setStatus(mazo.length > 0 ? 'ready' : 'error')
        saveGustos(scores.current, seen.current) // persiste el decay aplicado
      })
      .catch(() => setStatus('error'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const swipe = useCallback((dir: DirSwipeDescubri) => {
    const [top, ...rest] = deckRef.current
    if (!top) return
    // Carta especial: solo avanza el mazo — sin scores, sin seen, sin liked,
    // sin re-sort (nada cambió en la afinidad).
    if (top._tipo) {
      history.current.push({ especial: top, dir })
      deckRef.current = rest
      setRemaining(rest)
      if (rest.length === 0) setStatus('done')
      return
    }
    const w = dir === 'like' ? W_LIKE : W_SKIP
    bump(`c:${top.categoriaId}`, w.cat)
    bump(`m:${top.marcaId}`, w.marca)
    bump(`b:${priceBand(top.precio)}`, w.band)
    history.current.push({ product: top, dir, prevSeen: seen.current[String(top.id)] })
    seen.current[String(top.id)] = dir
    saveGustos(scores.current, seen.current)
    // Reordena lo que queda según la afinidad acumulada
    const sorted = ordenarConEspeciales(rest)
    deckRef.current = sorted
    setRemaining(sorted)
    if (dir === 'like') setLiked((l) => (l.some((p) => p.id === top.id) ? l : [...l, top]))
    if (sorted.length === 0) setStatus('done')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const undo = useCallback(() => {
    const last = history.current.pop()
    if (!last) return
    // Carta especial: solo se reinsertó al mazo, no hay scores/seen que revertir
    if ('especial' in last) {
      deckRef.current = [last.especial, ...deckRef.current]
      setRemaining(deckRef.current)
      setStatus('ready')
      return
    }
    const w = last.dir === 'like' ? W_LIKE : W_SKIP
    bump(`c:${last.product.categoriaId}`, -w.cat)
    bump(`m:${last.product.marcaId}`, -w.marca)
    bump(`b:${priceBand(last.product.precio)}`, -w.band)
    if (last.prevSeen === undefined) delete seen.current[String(last.product.id)]
    else seen.current[String(last.product.id)] = last.prevSeen
    saveGustos(scores.current, seen.current)
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
