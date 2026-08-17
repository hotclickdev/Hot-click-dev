import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { loadGustos, affinityOf } from '@/utils/gustos'
import { motion, AnimatePresence } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'
import { productService, normalizeProduct } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import { convenioService } from '@/services/convenioService'
import QuickViewModal from '@/components/ui/QuickViewModal'
import useLazyLoad from '@/hooks/useLazyLoad'
import ProductsAssistantPanel from '@/components/ai/ProductsAssistantPanel'
import { useToast } from '@/components/ui/Toast'
import { colapsarGruposVariante, buildCategoryTree } from './catalogo/catalogoHelpers'
import {
  PAGE_SIZE, categoryScopeIds, filtrarCatalogo, sortCatalogo,
} from './catalogo/catalogoFiltros'
import CatalogFilterBar from './catalogo/CatalogFilterBar'
import CategorySidebar from './catalogo/CategorySidebar'
import BrandShowcase from './catalogo/BrandShowcase'
import SubcategoryGrid from './catalogo/SubcategoryGrid'
import OfertasView from './catalogo/OfertasView'
import EmprendimientosView from './catalogo/EmprendimientosView'
import CartMiniBar from './catalogo/CartMiniBar'
import CatalogViewTabs from './catalogo/CatalogViewTabs'
import CatalogHero from './catalogo/CatalogHero'
import ActiveFilterChips from './catalogo/ActiveFilterChips'
import CatalogProductGrid from './catalogo/CatalogProductGrid'
import CatalogSeoHelmet from './catalogo/CatalogSeoHelmet'

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()

  const [products,  setProducts]  = useState([])
  const [categories, setCategories] = useState([])
  const [marcas,    setMarcas]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [page,      setPage]      = useState(() => {
    const p = Number.parseInt(searchParams.get('page') ?? '0', 10)
    return Number.isNaN(p) || p < 0 ? 0 : p
  })
  const [, setTotalPages] = useState(1)
  const [viewMode,  setViewMode]  = useState('all')
  const [convenios, setConvenios] = useState([])

  const [search,      setSearch]      = useState(() => searchParams.get('search') ?? '')
  const [category,    setCategory]    = useState(() => searchParams.get('cat') ?? '')
  const [marcasFilter, setMarcasFilter] = useState(() => {
    const raw = searchParams.get('marcas') ?? searchParams.get('marcaId') ?? ''
    return new Set(raw ? raw.split(',').filter(Boolean) : [])
  })
  const [sort, setSort] = useState(() =>
    searchParams.get('sort') ?? localStorage.getItem('hc-products-sort') ?? 'default')
  const gustosScores = useMemo(
    () => (sort === 'para_vos' ? loadGustos().scores : null),
    [sort]
  )
  const [filterStock, setFilterStock] = useState('')
  const [filterCond,  setFilterCond]  = useState('')
  const [filterTalla, setFilterTalla] = useState('')
  const [priceMin,    setPriceMin]    = useState('')
  const [priceMax,    setPriceMax]    = useState('')
  const [quickView,       setQuickView]       = useState(null)
  const [aiPanelOpen,     setAiPanelOpen]     = useState(false)
  const [sidebarOpen,     setSidebarOpen]     = useState(false)
  const [filterViewPage,  setFilterViewPage]  = useState(0)
  const aiQuery = searchParams.get('q') || ''

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- abrir panel IA desde ?ai=1
    if (searchParams.get('ai') === '1') setAiPanelOpen(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [productGridRef, shouldRenderGrid] = useLazyLoad({ threshold: 0.1, rootMargin: '200px' })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nueva búsqueda arranca en página 0
    setFilterViewPage(0)
  }, [search, category, marcasFilter, filterStock, filterCond, filterTalla, priceMin, priceMax, sort])

  useEffect(() => {
    const params = {}
    if (search)             params.search = search
    if (category)           params.cat = category
    if (marcasFilter.size)  params.marcas = [...marcasFilter].join(',')
    if (page > 0)           params.page = String(page)
    if (sort && sort !== 'default') params.sort = sort
    setSearchParams(params, { replace: true })
  }, [search, category, marcasFilter, page, sort, setSearchParams])

  const fetchProducts = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const { data } = await productService.getAll(p, PAGE_SIZE)
      const content = colapsarGruposVariante((data.content ?? data ?? []).map(normalizeProduct))
      // Calcular totalPages desde totalElements para mayor precisión
      const safeTotal = data.totalElements != null
        ? Math.ceil(data.totalElements / PAGE_SIZE)
        : (data.totalPages ?? 1)
      const clampedTotal = Math.max(1, safeTotal)

      if (content.length === 0 && p > 0) {
        // Página fantasma: el backend reportó más páginas de las que existen con contenido
        // Volver a página 0 automáticamente
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
    marcaService.getPublicas().then(r => {
      const ms = r.data?.data ?? r.data ?? []
      setMarcas(Array.isArray(ms) ? ms : [])
    }).catch(() => toast({ message: 'Error al cargar marcas', type: 'error' }))
    convenioService.getPublicos()
      .then(r => setConvenios(r.data?.data ?? []))
      .catch(() => toast({ message: 'Error al cargar convenios', type: 'error' }))
  }, [toast])

  const convenioMarcaNames = useMemo(() =>
    new Set(convenios.map(c => c.nombre?.toLowerCase()).filter(Boolean))
  , [convenios])

  const toggleMarca = useCallback((id) => {
    setMarcasFilter(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const clearMarcas = useCallback(() => setMarcasFilter(new Set()), [])

  const categoryScope = useMemo(
    () => categoryScopeIds(category, categories),
    [category, categories]
  )

  const filtered = useMemo(() => {
    const minPrice = priceMin !== '' ? Number(priceMin) : null
    const maxPrice = priceMax !== '' ? Number(priceMax) : null
    const lista = filtrarCatalogo({
      products, viewMode, convenioMarcaNames, search, categoryScope,
      marcasFilter, filterStock, filterCond, filterTalla, minPrice, maxPrice,
    })
    return sortCatalogo(lista, sort, gustosScores, affinityOf)
  }, [products, search, categoryScope, marcasFilter, sort, gustosScores, filterStock, filterCond, priceMin, priceMax, viewMode, convenioMarcaNames, filterTalla])

  const productCountByCat = useMemo(() => {
    const counts = {}
    products.forEach(p => {
      if (p.categoriaId) counts[p.categoriaId] = (counts[p.categoriaId] ?? 0) + 1
    })
    return counts
  }, [products])

  const categoryTotalCount = useMemo(() => {
    const counts = {}
    categories.forEach(cat => {
      const scope = categoryScopeIds(cat.id, categories)
      counts[cat.id] = scope
        ? products.filter(p => scope.has(String(p.categoriaId))).length
        : 0
    })
    return counts
  }, [categories, products])

  const marcasCountInScope = useMemo(() => {
    const base = categoryScope
      ? products.filter(p => categoryScope.has(String(p.categoriaId)))
      : products
    return Object.fromEntries(
      marcas.map(m => [m.id, base.filter(p => String(p.marcaId) === String(m.id)).length])
    )
  }, [marcas, products, categoryScope])

  const marcasForCategoryScope = useMemo(() => {
    if (!categoryScope) return null
    const ids = new Set()
    products.forEach(p => {
      if (p.marcaId && categoryScope.has(String(p.categoriaId))) {
        ids.add(String(p.marcaId))
      }
    })
    return ids
  }, [categoryScope, products])

  const selectedParentNode = useMemo(() => {
    if (!category) return null
    const t = buildCategoryTree(categories)
    const rootNode = t.find(r => String(r.id) === String(category))
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
    setCategory(''); clearMarcas(); setFilterStock(''); setFilterCond('')
    setFilterTalla(''); setSearch(''); setPriceMin(''); setPriceMax('')
  }, [clearMarcas])

  const activeCatName = category
    ? (categories.find(c => String(c.id) === String(category))?.nombreCategoria
      ?? categories.find(c => String(c.id) === String(category))?.nombre)
    : null

  const gridAnimKey = search + category + sort + filterStock + filterCond + priceMin + priceMax + [...marcasFilter].join()

  return (
    <>
      <ProductsAssistantPanel
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        initialQuery={aiQuery}
        onCategoryFilter={(nombre) => {
          const match = categories.find(c =>
            (c.nombreCategoria ?? c.nombre ?? '').toLowerCase().includes(nombre.toLowerCase())
          )
          if (match) {
            setCategory(String(match.id))
            setAiPanelOpen(false)
          }
        }}
      />

      <button
        onClick={() => setAiPanelOpen(v => !v)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 py-4 px-1.5 rounded-r-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
        style={{
          background: aiPanelOpen
            ? 'rgba(255,255,255,0.12)'
            : 'var(--hc-accent)',
          color: '#fff',
          border: aiPanelOpen ? '1px solid rgba(255,255,255,0.2)' : 'none',
          backdropFilter: aiPanelOpen ? 'blur(8px)' : 'none',
        }}
        aria-label={aiPanelOpen ? 'Cerrar asistente IA' : 'Abrir asistente IA'}
      >
        <span style={{ fontSize: 14, animation: aiPanelOpen ? 'none' : 'hc-fab-pulse 2s ease-in-out infinite' }}>✦</span>
        <span style={{
          writingMode: 'vertical-lr',
          transform: 'rotate(180deg)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}>¿DUDAS?</span>
        <style>{`@keyframes hc-fab-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.15)}}`}</style>
      </button>

      <MainLayout>
      <CatalogSeoHelmet
        viewMode={viewMode} activeCatName={activeCatName}
        marcas={marcas} marcasFilter={marcasFilter}
        hasFilters={hasFilters} category={category}
        filtered={filtered} products={products}
      />

      <CatalogViewTabs
        viewMode={viewMode}
        onSelect={(id) => { setViewMode(id); clearFilters() }}
      />

      <AnimatePresence mode="wait">
        {viewMode === 'ofertas' && (
          <OfertasView key="v-ofertas" products={filtered} loading={loading} />
        )}
        {viewMode === 'emprendimientos' && (
          <EmprendimientosView key="v-emp" products={filtered} convenios={convenios} loading={loading} onBack={() => setViewMode('all')} />
        )}
        {viewMode === 'all' && (
          <motion.div key="v-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }} className="min-h-screen" style={{ background: 'var(--hc-bg)' }}>

            <CatalogHero
              activeCatName={activeCatName}
              filteredCount={filtered.length}
              onClearCategory={() => setCategory('')}
            />

            <CatalogFilterBar
              search={search} setSearch={setSearch}
              sort={sort} setSort={setSort}
              categories={categories} categoryTotalCount={categoryTotalCount}
              category={category} setCategory={setCategory}
              hasFilters={hasFilters} clearFilters={clearFilters}
              onOpenSidebar={() => setSidebarOpen(true)}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
              <div className="flex items-start gap-6">
                <aside
                  className="hidden lg:block shrink-0 sticky"
                  style={{ width: 252, top: 72, alignSelf: 'flex-start' }}
                >
                  <div className="rounded-2xl p-4"
                    style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                    <CategorySidebar
                      categories={categories}
                      category={category}
                      setCategory={setCategory}
                      categoryTotalCount={categoryTotalCount}
                    />
                  </div>
                </aside>

                <div className="flex-1 min-w-0 space-y-4">
                  <ActiveFilterChips
                    marcas={marcas} marcasFilter={marcasFilter} toggleMarca={toggleMarca}
                    filterCond={filterCond} setFilterCond={setFilterCond}
                    filterStock={filterStock} setFilterStock={setFilterStock}
                    filterTalla={filterTalla} setFilterTalla={setFilterTalla}
                    priceMin={priceMin} priceMax={priceMax}
                    setPriceMin={setPriceMin} setPriceMax={setPriceMax}
                    clearFilters={clearFilters}
                  />

                  {!loading && marcas.length > 0 && (
                    <BrandShowcase
                      marcas={marcas}
                      visibleMarcaIds={marcasForCategoryScope}
                      marcasCountInScope={marcasCountInScope}
                      marcasFilter={marcasFilter}
                      toggleMarca={toggleMarca}
                      clearMarcas={clearMarcas}
                      title={category ? 'Marcas en esta categoría' : 'Compra por Marca'}
                    />
                  )}

                  {showSubcatGrid && (
                    <SubcategoryGrid
                      subcats={selectedParentNode.children}
                      onSelect={(id) => { setCategory(id); globalThis.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      productCountByCat={productCountByCat}
                    />
                  )}

                  <CatalogProductGrid
                    gridRef={productGridRef}
                    shouldRender={shouldRenderGrid}
                    loading={loading}
                    filtered={filtered}
                    filteredSlice={filteredSlice}
                    filteredPages={filteredPages}
                    filterViewPage={filterViewPage}
                    onPageChange={setFilterViewPage}
                    hasFilters={hasFilters}
                    onClearFilters={clearFilters}
                    flatGrid={flatGrid}
                    animKey={gridAnimKey}
                    search={search}
                    products={products}
                    categories={categories}
                    convenioMarcaNames={convenioMarcaNames}
                    onVerMas={(catId) => { setCategory(String(catId)); globalThis.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    onVerEmprendimientos={() => { setViewMode('emprendimientos'); clearFilters() }}
                    onQuickView={setQuickView}
                    page={page}
                  />
                </div>
              </div>

              <AnimatePresence>
                {sidebarOpen && (
                  <>
                    <motion.div
                      key="sidebar-backdrop"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setSidebarOpen(false)}
                      className="fixed inset-0 z-40 lg:hidden"
                      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
                    />
                    <motion.aside
                      key="sidebar-drawer"
                      initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                      transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                      className="hc-drawer-surface fixed left-0 top-0 bottom-0 z-50 overflow-y-auto lg:hidden"
                      style={{
                        width: 'min(300px, 90vw)',
                        background: 'var(--hc-surface)',
                        borderRight: '1px solid var(--hc-border)',
                        boxShadow: '8px 0 48px rgba(0,0,0,0.14)',
                      }}
                    >
                      <div className="flex items-center justify-between px-5 py-4"
                        style={{ borderBottom: '1px solid var(--hc-border)' }}>
                        <p className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>Filtrar catálogo</p>
                        <button
                          onClick={() => setSidebarOpen(false)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-60"
                          style={{ color: 'var(--hc-muted)' }}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                      <div className="p-5">
                        <CategorySidebar
                          categories={categories}
                          category={category}
                          setCategory={setCategory}
                          categoryTotalCount={categoryTotalCount}
                          onCategorySelect={() => setSidebarOpen(false)}
                        />
                      </div>
                    </motion.aside>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
      </AnimatePresence>

      <CartMiniBar />
    </MainLayout>
    </>
  )
}
