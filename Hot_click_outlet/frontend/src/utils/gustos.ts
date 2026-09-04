// Perfil de gustos del visitante (likes en Descubrí / chips legacy) persistido por navegador.
// Lo consumen el mazo de Descubrí y el orden/filtro "Según tus gustos" del catálogo.

import type { Producto } from '@/types/producto'
import { categoryScopeIds } from '@/pages/catalogo/catalogoFiltros'

export const LS_KEY = 'hotclick-descubri-gustos'

/** Peso al guardar una categoría seleccionada en chips (compatible con affinityOf). */
export const CHIP_CAT_SCORE = 10
/** Peso al guardar una banda de precio seleccionada. */
export const CHIP_BAND_SCORE = 5

/** Likes acumulados para pasar a revelación animada. */
export const LIKES_PARA_REVELAR = 3
/** Swipes totales (like + skip) para revelar aunque haya pocos likes. */
export const SWIPES_PARA_REVELAR = 8
/** Desplazamiento horizontal (px) para confirmar like/skip en drag. */
export const UMBRAL_ARRASTRE_PX = 100
/** Duración del overlay de revelación (ms). */
export const DURACION_REVELACION_MS = 1000

/** Delta al dar like a un producto en el mazo (crea perfil si no existía). */
export const LIKE_CAT_DELTA = 4
export const LIKE_MARCA_DELTA = 2
export const LIKE_BAND_DELTA = 2

export type PriceBandId = 'b1' | 'b2' | 'b3' | 'b4'

export const PRICE_BANDS: { id: PriceBandId; maxExclusive: number | null }[] = [
  { id: 'b1', maxExclusive: 10000 },
  { id: 'b2', maxExclusive: 25000 },
  { id: 'b3', maxExclusive: 50000 },
  { id: 'b4', maxExclusive: null },
]

type GustosSeen = Record<string, unknown>
export type GustosScores = Map<string, number>

export type GustosPerfil = {
  scores: GustosScores
  seen: GustosSeen
  selectedCategoryIds: string[]
  selectedPriceBands: PriceBandId[]
}

/** Respuesta de GET /api/customer-memory/affinity (scores compatibles con affinityOf). */
export type GustosAffinityPayload = {
  scores: Record<string, number>
  selectedCategoryIds: string[]
  selectedPriceBands: PriceBandId[]
  fromBackend?: boolean
}

export type CategoriaScope = {
  id?: unknown
  padreId?: unknown
  parentId?: unknown
  categoriaPadre?: { id?: unknown }
}

/** Unifica padreId para categoryScopeIds (API puede mandar parentId / categoriaPadre). */
export function categoriasConPadre(categories: CategoriaScope[]): { id?: unknown; padreId?: unknown }[] {
  return categories.map((c) => ({
    id: c.id,
    padreId: c.padreId ?? c.categoriaPadre?.id ?? c.parentId ?? null,
  }))
}

// Bandas de precio para el scoring (₡ enteros)
export function priceBand(precio: number): PriceBandId {
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

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v)).filter(Boolean)
}

function asPriceBands(value: unknown): PriceBandId[] {
  const valid = new Set<string>(PRICE_BANDS.map((b) => b.id))
  return asStringArray(value).filter((id): id is PriceBandId => valid.has(id))
}

/** Categorías con score positivo (chips o likes viejos de swipe). */
export function positiveCategoryIds(scores: GustosScores): string[] {
  const ids: string[] = []
  for (const [k, v] of scores) {
    if (k.startsWith('c:') && v > 0) ids.push(k.slice(2))
  }
  return ids
}

/** Bandas con score positivo. */
export function positivePriceBands(scores: GustosScores): PriceBandId[] {
  const ids: PriceBandId[] = []
  for (const [k, v] of scores) {
    if (k.startsWith('b:') && v > 0) {
      const band = k.slice(2) as PriceBandId
      if (PRICE_BANDS.some((b) => b.id === band)) ids.push(band)
    }
  }
  return ids
}

/**
 * Carga el perfil. `decay` queda por compatibilidad pero ya no se usa:
 * la selección por chips es explícita hasta que el visitante la cambie.
 */
export function loadGustos(_opts: { decay?: boolean } = {}): GustosPerfil {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
    const raw = asRecord(parsed)
    const scores: GustosScores = new Map()
    for (const [k, v] of Object.entries(asRecord(raw.scores))) {
      const num = typeof v === 'number' ? v : Number(v)
      if (!Number.isFinite(num)) continue
      if (Math.abs(num) >= 0.5) scores.set(k, num)
    }
    const selectedCategoryIds = asStringArray(raw.selectedCategoryIds)
    const selectedPriceBands = asPriceBands(raw.selectedPriceBands)
    // Perfiles viejos de swipe: inferir selección desde scores positivos
    const cats = selectedCategoryIds.length > 0
      ? selectedCategoryIds
      : positiveCategoryIds(scores)
    const bands = selectedPriceBands.length > 0
      ? selectedPriceBands
      : positivePriceBands(scores)
    return {
      scores,
      seen: asRecord(raw.seen) as GustosSeen,
      selectedCategoryIds: cats,
      selectedPriceBands: bands,
    }
  } catch {
    return {
      scores: new Map(),
      seen: {},
      selectedCategoryIds: [],
      selectedPriceBands: [],
    }
  }
}

/** Guarda el perfil completo (chips). Reemplaza scores por la selección actual. */
export function saveGustosSeleccion(
  categoryIds: string[],
  priceBands: PriceBandId[] = [],
) {
  const scores = new Map<string, number>()
  for (const id of categoryIds) {
    if (!id || id === 'null' || id === 'undefined') continue
    scores.set(`c:${id}`, CHIP_CAT_SCORE)
  }
  for (const band of priceBands) {
    scores.set(`b:${band}`, CHIP_BAND_SCORE)
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      scores: Object.fromEntries(scores),
      seen: {},
      selectedCategoryIds: categoryIds,
      selectedPriceBands: priceBands,
      updatedAt: Date.now(),
    }))
  } catch { /* almacenamiento lleno o bloqueado */ }
}

/** @deprecated Preferí saveGustosSeleccion. Compat con callers viejos. */
export function saveGustos(scores: GustosScores, seen: GustosSeen) {
  try {
    const ids = Object.keys(seen)
    if (ids.length > 500) {
      for (const id of ids.slice(0, ids.length - 500)) delete seen[id]
    }
    localStorage.setItem(LS_KEY, JSON.stringify({
      scores: Object.fromEntries(scores),
      seen,
      selectedCategoryIds: positiveCategoryIds(scores),
      selectedPriceBands: positivePriceBands(scores),
      updatedAt: Date.now(),
    }))
  } catch { /* almacenamiento lleno o bloqueado */ }
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

/** Boosts de merchandising — sin costo de API; usan campos ya en el producto. */
export const BOOST_DESTACADO = 2.5
export const BOOST_OFERTA = 1.5
export const BOOST_CON_STOCK = 0.5
export const PENALTY_VISTO_RECIENTE = 3
const BEHAVIOR_CAP = 30
const BUMP_VISTA = { cat: 0.4, marca: 0.3, band: 0.15 }

export function merchandisingBoost(
  p: Pick<Producto, 'destacado' | 'enOferta' | 'stock'>,
): number {
  let boost = 0
  if (p.destacado) boost += BOOST_DESTACADO
  if (p.enOferta) boost += BOOST_OFERTA
  if ((p.stock ?? 0) > 0) boost += BOOST_CON_STOCK
  return boost
}

/** IDs vistos recientemente (Zustand persist). */
export function loadRecentlyViewedIds(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('hotclick-recently-viewed') ?? '{}')
    const raw = asRecord(parsed)
    const state = asRecord(raw.state)
    const items = Array.isArray(state.items) ? state.items : []
    return new Set(
      items
        .map((it) => {
          if (it && typeof it === 'object' && 'id' in it) return String((it as { id: unknown }).id)
          return ''
        })
        .filter(Boolean),
    )
  } catch {
    return new Set()
  }
}

/**
 * Ranking híbrido para Descubrí / "Según tus gustos":
 * afinidad chips + destacado/oferta/stock − vistos recientes.
 * Cero costo externo.
 */
export function rankScoreParaVos(
  p: Producto,
  scores: GustosScores,
  viewedIds: Set<string> = loadRecentlyViewedIds(),
): number {
  let score = affinityOf(p, scores) + merchandisingBoost(p)
  if (p.id != null && viewedIds.has(String(p.id))) score -= PENALTY_VISTO_RECIENTE
  return score
}

function bumpScore(scores: GustosScores, key: string, delta: number) {
  if (/(null|undefined|:)$/.test(key)) return
  const next = (scores.get(key) ?? 0) + delta
  scores.set(key, Math.max(-BEHAVIOR_CAP, Math.min(BEHAVIOR_CAP, next)))
}

/**
 * Aprendizaje pasivo al ver un producto (gratis, solo localStorage).
 * No inventa perfil: solo refuerza si ya hay chips guardados.
 */
export function bumpGustosDesdeVista(
  p: Pick<Producto, 'categoriaId' | 'marcaId' | 'precio'>,
) {
  const perfil = loadGustos()
  if (!hasGustos(perfil)) return
  const scores = new Map(perfil.scores)
  if (p.categoriaId != null && String(p.categoriaId) !== '') {
    bumpScore(scores, `c:${p.categoriaId}`, BUMP_VISTA.cat)
  }
  if (p.marcaId != null) bumpScore(scores, `m:${p.marcaId}`, BUMP_VISTA.marca)
  bumpScore(scores, `b:${priceBand(p.precio ?? 0)}`, BUMP_VISTA.band)
  persistPerfil(scores, perfil.seen, positiveCategoryIds(scores), positivePriceBands(scores))
}

function persistPerfil(
  scores: GustosScores,
  seen: GustosSeen,
  selectedCategoryIds: string[],
  selectedPriceBands: PriceBandId[],
) {
  try {
    const ids = Object.keys(seen)
    if (ids.length > 500) {
      for (const id of ids.slice(0, ids.length - 500)) delete seen[id]
    }
    localStorage.setItem(LS_KEY, JSON.stringify({
      scores: Object.fromEntries(scores),
      seen,
      selectedCategoryIds,
      selectedPriceBands,
      updatedAt: Date.now(),
    }))
  } catch { /* almacenamiento lleno o bloqueado */ }
}

/**
 * Like en el mazo: crea o refuerza el perfil (categoría, marca, banda de precio)
 * y marca el producto como visto. Puede crear perfil desde el primer like.
 */
export function aplicarLikeProducto(
  p: Pick<Producto, 'id' | 'categoriaId' | 'marcaId' | 'precio'>,
): GustosPerfil {
  const perfil = loadGustos()
  const scores = new Map(perfil.scores)
  const seen = { ...perfil.seen }

  if (p.categoriaId != null && String(p.categoriaId) !== '') {
    bumpScore(scores, `c:${p.categoriaId}`, LIKE_CAT_DELTA)
  }
  if (p.marcaId != null) bumpScore(scores, `m:${p.marcaId}`, LIKE_MARCA_DELTA)
  bumpScore(scores, `b:${priceBand(p.precio ?? 0)}`, LIKE_BAND_DELTA)

  if (p.id != null) seen[String(p.id)] = Date.now()

  const selectedCategoryIds = positiveCategoryIds(scores)
  const selectedPriceBands = positivePriceBands(scores)
  persistPerfil(scores, seen, selectedCategoryIds, selectedPriceBands)
  return { scores, seen, selectedCategoryIds, selectedPriceBands }
}

/** Marca un producto como visto sin cambiar scores (skip). */
export function marcarProductoVisto(productoId: string | number | null | undefined): GustosPerfil {
  const perfil = loadGustos()
  if (productoId == null) return perfil
  const seen = { ...perfil.seen, [String(productoId)]: Date.now() }
  persistPerfil(
    perfil.scores,
    seen,
    perfil.selectedCategoryIds,
    perfil.selectedPriceBands,
  )
  return { ...perfil, seen }
}

/** true si el producto ya se swipeó en este navegador. */
export function productoYaVisto(
  productoId: string | number | null | undefined,
  perfil?: GustosPerfil,
): boolean {
  if (productoId == null) return false
  const p = perfil ?? loadGustos()
  return String(productoId) in p.seen
}

/** true si conviene pasar a revelación (likes / swipes / mazo vacío). */
export function debeRevelar(likes: number, swipes: number, mazoVacio: boolean): boolean {
  if (mazoVacio) return true
  if (likes >= LIKES_PARA_REVELAR) return true
  return swipes >= SWIPES_PARA_REVELAR
}

/** true si hay scores útiles en la respuesta del backend. */
export function hasAffinityContent(payload: GustosAffinityPayload): boolean {
  if (payload.selectedCategoryIds.length > 0) return true
  return Object.keys(payload.scores ?? {}).some((k) => k.startsWith('c:') || k.startsWith('m:'))
}

/** Convierte afinidad del backend en GustosPerfil (read-only). */
export function gustosPerfilFromAffinity(payload: GustosAffinityPayload): GustosPerfil {
  const scores: GustosScores = new Map()
  for (const [k, v] of Object.entries(payload.scores ?? {})) {
    const num = typeof v === 'number' ? v : Number(v)
    if (Number.isFinite(num) && Math.abs(num) >= 0.5) scores.set(k, num)
  }
  const selectedCategoryIds = asStringArray(payload.selectedCategoryIds)
  const selectedPriceBands = asPriceBands(payload.selectedPriceBands)
  return {
    scores,
    seen: {},
    selectedCategoryIds: selectedCategoryIds.length > 0
      ? selectedCategoryIds
      : positiveCategoryIds(scores),
    selectedPriceBands: selectedPriceBands.length > 0
      ? selectedPriceBands
      : positivePriceBands(scores),
  }
}

/** true si el visitante ya eligió al menos una categoría. */
export function hasGustos(perfil?: GustosPerfil) {
  const p = perfil ?? loadGustos()
  return p.selectedCategoryIds.length > 0
}

/**
 * Producto relacionado: categoría en selección (o descendientes)
 * y, si hay bandas, precio en una de ellas.
 */
export function productoEsRelacionado(
  producto: Pick<Producto, 'categoriaId' | 'precio'>,
  perfil: GustosPerfil,
  categories: CategoriaScope[],
): boolean {
  if (perfil.selectedCategoryIds.length === 0) return false

  const catId = String(producto.categoriaId ?? '')
  if (!catId) return false

  const cats = categoriasConPadre(categories)
  let enCategoria = false
  for (const selected of perfil.selectedCategoryIds) {
    const scope = categoryScopeIds(selected, cats)
    if (scope?.has(catId)) {
      enCategoria = true
      break
    }
  }
  if (!enCategoria) return false

  if (perfil.selectedPriceBands.length === 0) return true
  return perfil.selectedPriceBands.includes(priceBand(producto.precio ?? 0))
}
