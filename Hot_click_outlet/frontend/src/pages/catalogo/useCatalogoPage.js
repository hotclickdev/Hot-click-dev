import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { loadGustos, affinityOf } from '@/utils/gustos'
import { productService, normalizeProduct } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import { convenioService } from '@/services/convenioService'
import { useToast } from '@/components/ui/Toast'
import { colapsarGruposVariante, buildCategoryTree } from './catalogoHelpers'
import {
  PAGE_SIZE,
  categoryScopeIds,
  filtrarCatalogo,
  sortCatalogo,
  parsePageFromSearchParams,
  parseMarcasFilterFromSearchParams,
  catalogoSearchParamsFromState,
} from './catalogoFiltros'

/**
 * Estado, sync URL ↔ filtros, fetch y derivados del catálogo.
 */
export function useCatalogoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [marcas, setMarcas] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(() => parsePageFromSearchParams(searchParams))
  const [, setTotalPages] = useState(1)
  const [viewMode, setViewMode] = useState('all')
  const [convenios, setConvenios] = useState([])

  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [category, setCategory] = useState(() => searchParams.get('cat') ?? '')
  const [marcasFilter, setMarcasFilter] = useState(() => parseMarcasFilterFromSearchParams(searchParams))
  const [sort, setSort] = useState(
    () => searchParams.get('sort') ?? localStorage.getItem('hc-products-sort') ?? 'default',
  )
  const gustosScores = useMemo(
    () => (sort === 'para_vos' ? loadGustos().scores : null),
    [sort],
  )
  const [filterStock, setFilterStock] = useState('')
  const [filterCond, setFilterCond] = useState('')
  const [filterTalla, setFilterTalla] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [quickView, setQuickView] = useState(null)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filterViewPage, setFilterViewPage] = useState(0)
  const aiQuery = searchParams.get('q') || ''

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- abrir panel IA desde ?ai=1
    if (searchParams.get('ai') === '1') setAiPanelOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nueva búsqueda arranca en página 0
    setFilterViewPage(0)
  }, [search, category, marcasFilter, filterStock, filterCond, filterTalla, priceMin, priceMax, sort])

  useEffect(() => {
    setSearchParams(
      catalogoSearchParamsFromState({ search, category, marcasFilter, page, sort }),
      { replace: true },
    )
  }, [search, category, marcasFilter, page, sort, setSearchParams])

  const fetchProducts = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const { data } = await productService.getAll(p, PAGE_SIZE)
      const content = colapsarGruposVariante((data.content ?? data ?? []).map(normalizeProduct))
      const safeTotal = data.totalElements != null
        ? Math.ceil(data.totalElements / PAGE_SIZE)
        : (data.totalPages ?? 1)
      const clampedTotal = Math.max(1, safeTotal)

      if (content.length === 0 && p > 0) {
        const { data: d0 } = await productService.getAll(0, PAGE_SIZE)
        const c0 = colapsarGruposVariante((d0.content ?? d0 ?? []).map(normalizeProduct))
        setProducts(c0)
        setTotalPages(clampedTotal)
        setPage(0)
      } else {
        setProducts(content)
        setTotalPages(clampedTotal)
        setPage(p)
      }
    } catch {
      toast({ message: 'Error al cargar productos', type: 'error' })
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  const initialPageRef = useRef(page)
  useEffect(() => { fetchProducts(initialPageRef.current) }, [fetchProducts])

  useEffect(() => {
    productService.getCategories()
      .then(({ data }) => setCategories(data ?? []))
      .catch(() => toast({ message: 'Error al cargar categorías', type: 'error' }))
    marcaService.getPublicas().then((r) => {
      const ms = r.data?.data ?? r.data ?? []
      setMarcas(Array.isArray(ms) ? ms : [])
    }).catch(() => toast({ message: 'Error al cargar marcas', type: 'error' }))
    convenioService.getPublicos()
      .then((r) => setConvenios(r.data?.data ?? []))
      .catch(() => toast({ message: 'Error al cargar convenios', type: 'error' }))
  }, [toast])

  const convenioMarcaNames = useMemo(
    () => new Set(convenios.map((c) => c.nombre?.toLowerCase()).filter(Boolean)),
    [convenios],
  )

  const toggleMarca = useCallback((id) => {
    setMarcasFilter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearMarcas = useCallback(() => setMarcasFilter(new Set()), [])

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

  const clearFilters = useCallback(() => {
    setCategory('')
    clearMarcas()
    setFilterStock('')
    setFilterCond('')
    setFilterTalla('')
    setSearch('')
    setPriceMin('')
    setPriceMax('')
  }, [clearMarcas])

  const activeCatName = category
    ? (categories.find((c) => String(c.id) === String(category))?.nombreCategoria
      ?? categories.find((c) => String(c.id) === String(category))?.nombre)
    : null

  const gridAnimKey = search + category + sort + filterStock + filterCond + priceMin + priceMax + [...marcasFilter].join()

  const selectCategoryFromAi = useCallback((nombre) => {
    const match = categories.find((c) =>
      (c.nombreCategoria ?? c.nombre ?? '').toLowerCase().includes(nombre.toLowerCase()),
    )
    if (match) {
      setCategory(String(match.id))
      setAiPanelOpen(false)
    }
  }, [categories])

  return {
    products,
    categories,
    marcas,
    loading,
    page,
    viewMode,
    setViewMode,
    convenios,
    search,
    setSearch,
    category,
    setCategory,
    marcasFilter,
    sort,
    setSort,
    filterStock,
    setFilterStock,
    filterCond,
    setFilterCond,
    filterTalla,
    setFilterTalla,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    quickView,
    setQuickView,
    aiPanelOpen,
    setAiPanelOpen,
    sidebarOpen,
    setSidebarOpen,
    filterViewPage,
    setFilterViewPage,
    aiQuery,
    toggleMarca,
    clearMarcas,
    clearFilters,
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
    convenioMarcaNames,
    selectCategoryFromAi,
  }
}
