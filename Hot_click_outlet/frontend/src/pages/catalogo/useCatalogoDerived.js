import { useMemo } from 'react'
import { affinityOf } from '@/utils/gustos'
import { buildCategoryTree } from './catalogoHelpers'
import {
  PAGE_SIZE,
  categoryScopeIds,
  filtrarCatalogo,
  sortCatalogo,
} from './catalogoFiltros'

/**
 * Derivados del catálogo: filtros aplicados, conteos y flags de vista.
 */
export function useCatalogoDerived({
  products, categories, marcas, convenios, viewMode,
  search, category, marcasFilter, sort, gustosScores,
  filterStock, filterCond, filterTalla, priceMin, priceMax, filterViewPage,
}) {
  const convenioMarcaNames = useMemo(
    () => new Set(convenios.map((c) => c.nombre?.toLowerCase()).filter(Boolean)),
    [convenios],
  )

  const categoryScope = useMemo(
    () => categoryScopeIds(category, categories),
    [category, categories],
  )

  const filtered = useMemo(() => {
    const minPrice = priceMin !== '' ? Number(priceMin) : null
    const maxPrice = priceMax !== '' ? Number(priceMax) : null
    const lista = filtrarCatalogo({
      products, viewMode, convenioMarcaNames, search, categoryScope,
      marcasFilter, filterStock, filterCond, filterTalla, minPrice, maxPrice,
    })
    return sortCatalogo(lista, sort, gustosScores, affinityOf)
  }, [
    products, search, categoryScope, marcasFilter, sort, gustosScores,
    filterStock, filterCond, priceMin, priceMax, viewMode, convenioMarcaNames, filterTalla,
  ])

  const productCountByCat = useMemo(() => {
    const counts = {}
    products.forEach((p) => {
      if (p.categoriaId) counts[p.categoriaId] = (counts[p.categoriaId] ?? 0) + 1
    })
    return counts
  }, [products])

  const categoryTotalCount = useMemo(() => {
    const counts = {}
    categories.forEach((cat) => {
      const scope = categoryScopeIds(cat.id, categories)
      counts[cat.id] = scope
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
    )
  }, [marcas, products, categoryScope])

  const marcasForCategoryScope = useMemo(() => {
    if (!categoryScope) return null
    const ids = new Set()
    products.forEach((p) => {
      if (p.marcaId && categoryScope.has(String(p.categoriaId))) {
        ids.add(String(p.marcaId))
      }
    })
    return ids
  }, [categoryScope, products])

  const selectedParentNode = useMemo(() => {
    if (!category) return null
    const t = buildCategoryTree(categories)
    const rootNode = t.find((r) => String(r.id) === String(category))
    return (rootNode?.children?.length ?? 0) > 0 ? rootNode : null
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
