import { useMemo } from 'react'
import { hasGustos, productoEsRelacionado, rankScoreParaVos, loadRecentlyViewedIds, type GustosPerfil } from '@/utils/gustos'
import { buildCategoryTree } from './catalogoHelpers'
import {
  PAGE_SIZE,
  categoryScopeIds,
  filtrarCatalogo,
  sortCatalogo,
} from './catalogoFiltros'
import type { Producto } from '@/types/producto'
import type {
  CatalogCategoria,
  CatalogCategoriaNodo,
  CatalogConvenio,
  CatalogCounts,
  CatalogMarca,
  CatalogViewMode,
} from './catalogoTipos'

type CatalogoDerivedArgs = {
  products: Producto[]
  categories: CatalogCategoria[]
  marcas: CatalogMarca[]
  convenios: CatalogConvenio[]
  viewMode: CatalogViewMode | string
  search: string
  category: string
  marcasFilter: Set<string>
  sort: string
  gustosScores: Map<string, number> | null
  gustosPerfil: GustosPerfil | null
  filterStock: string
  filterCond: string
  filterTalla: string
  priceMin: string
  priceMax: string
  filterViewPage: number
}

/**
 * Derivados del catálogo: filtros aplicados, conteos y flags de vista.
 */
export function useCatalogoDerived({
  products, categories, marcas, convenios, viewMode,
  search, category, marcasFilter, sort, gustosScores, gustosPerfil,
  filterStock, filterCond, filterTalla, priceMin, priceMax, filterViewPage,
}: CatalogoDerivedArgs) {
  const convenioMarcaNames = useMemo(
    () => new Set(convenios.map((c) => c.nombre?.toLowerCase()).filter((n): n is string => Boolean(n))),
    [convenios],
  )

  const categoryScope = useMemo(
    () => categoryScopeIds(category, categories),
    [category, categories],
  )

  const filtered = useMemo(() => {
    const minPrice = priceMin !== '' ? Number(priceMin) : null
    const maxPrice = priceMax !== '' ? Number(priceMax) : null
    let lista = filtrarCatalogo({
      products, viewMode, convenioMarcaNames, search, categoryScope,
      marcasFilter, filterStock, filterCond, filterTalla, minPrice, maxPrice,
    })
    // "Según tus gustos": oculta lo no relacionado (no solo reordena).
    if (sort === 'para_vos') {
      if (!gustosPerfil || !hasGustos(gustosPerfil)) return []
      lista = lista.filter((p) => productoEsRelacionado(p, gustosPerfil, categories))
      const viewed = loadRecentlyViewedIds()
      const scores = gustosPerfil.scores
      return [...lista].sort(
        (a, b) => rankScoreParaVos(b, scores, viewed) - rankScoreParaVos(a, scores, viewed),
      )
    }
    return sortCatalogo(lista, sort, gustosScores, (p, scores) => rankScoreParaVos(p, scores))
  }, [
    products, search, categoryScope, marcasFilter, sort, gustosScores, gustosPerfil,
    categories, filterStock, filterCond, priceMin, priceMax, viewMode, convenioMarcaNames, filterTalla,
  ])

  const productCountByCat = useMemo(() => {
    const counts: CatalogCounts = {}
    products.forEach((p) => {
      if (p.categoriaId) counts[String(p.categoriaId)] = (counts[String(p.categoriaId)] ?? 0) + 1
    })
    return counts
  }, [products])

  const categoryTotalCount = useMemo(() => {
    const counts: CatalogCounts = {}
    categories.forEach((cat) => {
      const scope = categoryScopeIds(cat.id, categories)
      counts[String(cat.id)] = scope
        ? products.filter((p) => scope.has(String(p.categoriaId))).length
        : 0
    })
    return counts
  }, [categories, products])

  const marcasCountInScope = useMemo(() => {
    const base = categoryScope
      ? products.filter((p) => categoryScope.has(String(p.categoriaId)))
      : products
    return Object.fromEntries(
      marcas.map((m) => [m.id, base.filter((p) => String(p.marcaId) === String(m.id)).length]),
    ) as CatalogCounts
  }, [marcas, products, categoryScope])

  const marcasForCategoryScope = useMemo(() => {
    if (!categoryScope) return null
    const ids = new Set<string>()
    products.forEach((p) => {
      if (p.marcaId && categoryScope.has(String(p.categoriaId))) {
        ids.add(String(p.marcaId))
      }
    })
    return ids
  }, [categoryScope, products])

  const selectedParentNode = useMemo((): CatalogCategoriaNodo | null => {
    if (!category) return null
    const t = buildCategoryTree(categories)
    const rootNode = t.find((r) => String(r.id) === String(category))
    return (rootNode?.children?.length ?? 0) > 0 ? rootNode ?? null : null
  }, [category, categories])

  const hasFilters = !!(category || marcasFilter.size || filterStock || filterCond || filterTalla || priceMin || priceMax || search)
  const flatGrid = hasFilters || sort === 'para_vos'
  const showSubcatGrid = !!(
    selectedParentNode &&
    !search && !filterCond && !filterStock && !priceMin && !priceMax && marcasFilter.size === 0
  )

  const filteredPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const filteredSlice = filtered.slice(filterViewPage * PAGE_SIZE, (filterViewPage + 1) * PAGE_SIZE)

  const activeCatName = category
    ? (categories.find((c) => String(c.id) === String(category))?.nombreCategoria
      ?? categories.find((c) => String(c.id) === String(category))?.nombre)
    : null

  const gridAnimKey = search + category + sort + filterStock + filterCond + priceMin + priceMax + [...marcasFilter].join()

  return {
    convenioMarcaNames,
    filtered,
    productCountByCat,
    categoryTotalCount,
    marcasCountInScope,
    marcasForCategoryScope,
    selectedParentNode,
    hasFilters,
    flatGrid,
    showSubcatGrid,
    filteredPages,
    filteredSlice,
    activeCatName,
    gridAnimKey,
  }
}
