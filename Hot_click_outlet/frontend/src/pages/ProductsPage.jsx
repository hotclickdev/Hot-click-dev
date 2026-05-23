import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { productService, normalizeProduct } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import Spinner from '@/components/ui/Spinner'
import QuickViewModal from '@/components/ui/QuickViewModal'
import ProductCard from '@/components/ui/ProductCard'
import useLazyLoad from '@/hooks/useLazyLoad'

const PAGE_SIZE = 24

export default function ProductsPage() {
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()

  const SORT_OPTIONS = [
    { value: 'default', label: t('products.sortBy') },
    { value: 'featured', label: 'Destacados' },
    { value: 'price_asc', label: t('products.priceAsc') },
    { value: 'price_desc', label: t('products.priceDesc') },
    { value: 'name', label: t('products.nameAsc') },
  ]

  const STOCK_OPTIONS = [
    { value: '', label: t('common.filter') },
    { value: 'ok', label: t('products.inStock') },
    { value: 'low', label: t('products.lowStock', { count: '' }).replace(' ', '') },
    { value: 'out', label: t('products.outOfStock') },
  ]

  const COND_OPTIONS = [
    { value: '', label: t('products.allCategories') },
    { value: 'NUEVO', label: 'Nuevo' },
    { value: 'COMO_NUEVO', label: 'Como nuevo' },
    { value: 'USADO', label: 'Usado' },
  ]

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [marcas, setMarcas] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [marca, setMarca] = useState(() => searchParams.get('marcaId') ?? '')
  const [sort, setSort] = useState('default')
  const [filterStock, setFilterStock] = useState('')
  const [filterCond, setFilterCond] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [quickView, setQuickView] = useState(null)
  const [productGridRef, shouldRenderGrid] = useLazyLoad({ threshold: 0.1, rootMargin: '200px' })

  const fetchProducts = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const { data } = await productService.getAll(p, PAGE_SIZE)
      const content = (data.content ?? data ?? []).map(normalizeProduct)
      setProducts(content)
      setTotalPages(data.totalPages ?? 1)
      setPage(p)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts(0) }, [fetchProducts])
  useEffect(() => {
    productService.getCategories().then(({ data }) => setCategories(data ?? [])).catch(() => {})
    marcaService.getAll().then(r => {
      const ms = r.data?.data ?? r.data ?? []
      setMarcas(Array.isArray(ms) ? ms : [])
    }).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    const minPrice = priceMin !== '' ? Number(priceMin) : null
    const maxPrice = priceMax !== '' ? Number(priceMax) : null
    return products
      .filter((p) => !search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.marcaNombre?.toLowerCase().includes(search.toLowerCase()))
      .filter((p) => !category || String(p.categoriaId) === String(category))
      .filter((p) => !marca || String(p.marcaId) === String(marca))
      .filter((p) => {
        if (filterStock === 'ok') return p.stock > 3
        if (filterStock === 'low') return p.stock > 0 && p.stock <= 3
        if (filterStock === 'out') return p.stock === 0
        return true
      })
      .filter((p) => !filterCond || p.condicion === filterCond)
      .filter((p) => (minPrice === null || p.precio >= minPrice) && (maxPrice === null || p.precio <= maxPrice))
      .sort((a, b) => {
        if (sort === 'featured') return (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0)
        if (sort === 'price_asc') return a.precio - b.precio
        if (sort === 'price_desc') return b.precio - a.precio
        if (sort === 'name') return a.nombre?.localeCompare(b.nombre)
        return 0
      })
  }, [products, search, category, marca, sort, filterStock, filterCond, priceMin, priceMax])

  const hasFilters = !!(category || marca || filterStock || filterCond || priceMin || priceMax)
  const clearFilters = () => { setCategory(''); setMarca(''); setFilterStock(''); setFilterCond(''); setSearch(''); setPriceMin(''); setPriceMax('') }

  const activeChips = [
    category && { key: 'cat', label: categories.find((c) => String(c.id) === String(category))?.nombreCategoria ?? categories.find((c) => String(c.id) === String(category))?.nombre ?? 'Categoría', clear: () => setCategory('') },
    marca && { key: 'marca', label: marcas.find((m) => String(m.id) === String(marca))?.nombreMarca ?? 'Marca', clear: () => setMarca('') },
    filterCond && { key: 'cond', label: COND_OPTIONS.find((o) => o.value === filterCond)?.label, clear: () => setFilterCond('') },
    filterStock && { key: 'stock', label: STOCK_OPTIONS.find((o) => o.value === filterStock)?.label, clear: () => setFilterStock('') },
    (priceMin || priceMax) && { key: 'price', label: priceMin && priceMax ? `₡${Number(priceMin).toLocaleString()} – ₡${Number(priceMax).toLocaleString()}` : priceMin ? `> ₡${Number(priceMin).toLocaleString()}` : `< ₡${Number(priceMax).toLocaleString()}`, clear: () => { setPriceMin(''); setPriceMax('') } },
  ].filter(Boolean)

  return (
    <MainLayout>
      {/* Mobile filter drawer */}
      <AnimatePresence>
        {filterDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 md:hidden"
              onClick={() => setFilterDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl md:hidden"
              style={{ background: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-4">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="px-5 pb-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#e8e8ed]">{t('common.filter')}</span>
                  <div className="flex items-center gap-3">
                    {hasFilters && (
                      <button onClick={clearFilters} className="text-xs text-[#4f7cff]">{t('common.clear')}</button>
                    )}
                    <button onClick={() => setFilterDrawerOpen(false)} className="text-xs text-[#8e8e9a] hover:text-white">{t('common.close')}</button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{t('products.allCategories')}</label>
                  <div className="flex flex-wrap gap-2">
                    <ChipBtn active={category === ''} onClick={() => setCategory('')}>{t('products.allCategories')}</ChipBtn>
                    {categories.map((c) => (
                      <ChipBtn key={c.id} active={String(category) === String(c.id)} onClick={() => setCategory(c.id)}>
                        {c.nombreCategoria ?? c.nombre}
                      </ChipBtn>
                    ))}
                  </div>
                </div>

                {marcas.length > 0 && (
                  <>
                    <div className="border-t border-white/6" />
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">Marca</label>
                      <div className="flex flex-wrap gap-2">
                        <ChipBtn active={marca === ''} onClick={() => setMarca('')}>Todas</ChipBtn>
                        {marcas.map((m) => (
                          <ChipBtn key={m.id} active={String(marca) === String(m.id)} onClick={() => setMarca(m.id)}>
                            {m.nombreMarca}
                          </ChipBtn>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t border-white/6" />

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">Condición</label>
                  <div className="flex flex-wrap gap-2">
                    {COND_OPTIONS.map(({ value, label }) => (
                      <ChipBtn key={value} active={filterCond === value} onClick={() => setFilterCond(value)}>{label}</ChipBtn>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/6" />

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">Disponibilidad</label>
                  <div className="flex flex-wrap gap-2">
                    {STOCK_OPTIONS.map(({ value, label }) => (
                      <ChipBtn key={value} active={filterStock === value} onClick={() => setFilterStock(value)}>{label}</ChipBtn>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/6" />

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">Precio (₡)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Mínimo"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      className="w-full h-9 rounded-xl px-3 text-sm bg-white/5 border text-[#e8e8ed] placeholder-[#8e8e9a] outline-none"
                      style={{ borderColor: 'var(--hc-border)' }}
                    />
                    <input
                      type="number"
                      placeholder="Máximo"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      className="w-full h-9 rounded-xl px-3 text-sm bg-white/5 border text-[#e8e8ed] placeholder-[#8e8e9a] outline-none"
                      style={{ borderColor: 'var(--hc-border)' }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => setFilterDrawerOpen(false)}
                  className="w-full h-12 rounded-2xl bg-[#4f7cff] text-white font-semibold text-sm mt-2"
                >
                  Ver {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#e8e8ed]">{t('products.title')}</h1>
            <p className="text-[#8e8e9a] text-sm mt-0.5">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          {/* Desktop: toggle sidebar */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-[#8e8e9a] hover:text-white transition-colors"
          >
            <FilterIcon />
            {sidebarOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
          {/* Mobile: open drawer */}
          <button
            onClick={() => setFilterDrawerOpen(true)}
            className="md:hidden flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-[#8e8e9a]"
          >
            <FilterIcon />
            {t('common.filter')}
            {hasFilters && <span className="w-2 h-2 rounded-full bg-[#4f7cff]" />}
          </button>
        </div>

        <div className="flex gap-6">
          {/* Left: filter sidebar — solo desktop */}
          <div className="hidden md:block">
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.aside
                key="sidebar"
                initial={{ opacity: 0, width: 0, x: -16 }}
                animate={{ opacity: 1, width: 220, x: 0 }}
                exit={{ opacity: 0, width: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 overflow-hidden"
                style={{ width: 220 }}
              >
                <div className="rounded-2xl p-4 space-y-5 sticky top-24"
                  style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                  {/* Filter header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">{t('common.filter')}</span>
                    {hasFilters && (
                      <button onClick={clearFilters} className="text-[10px] text-[#4f7cff] hover:underline">{t('common.clear')}</button>
                    )}
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#8e8e9a]">{t('products.allCategories')}</label>
                    <div className="space-y-0.5">
                      <FilterBtn active={category === ''} onClick={() => setCategory('')}>{t('products.allCategories')}</FilterBtn>
                      {categories.map((c) => (
                        <FilterBtn key={c.id} active={String(category) === String(c.id)} onClick={() => setCategory(c.id)}>
                          {c.nombreCategoria ?? c.nombre}
                        </FilterBtn>
                      ))}
                    </div>
                  </div>

                  <div className="border-t" style={{ borderColor: 'var(--hc-border)' }} />

                  {/* Marcas */}
                  {marcas.length > 0 && (
                    <>
                      <div className="border-t" style={{ borderColor: 'var(--hc-border)' }} />
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-[#8e8e9a]">Marca</label>
                        <div className="space-y-0.5">
                          <FilterBtn active={marca === ''} onClick={() => setMarca('')}>Todas</FilterBtn>
                          {marcas.map((m) => (
                            <FilterBtn key={m.id} active={String(marca) === String(m.id)} onClick={() => setMarca(m.id)}>
                              {m.nombreMarca}
                            </FilterBtn>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="border-t" style={{ borderColor: 'var(--hc-border)' }} />

                  {/* Condition */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#8e8e9a]">Condición</label>
                    <div className="space-y-0.5">
                      {COND_OPTIONS.map(({ value, label }) => (
                        <FilterBtn key={value} active={filterCond === value} onClick={() => setFilterCond(value)}>
                          {label}
                        </FilterBtn>
                      ))}
                    </div>
                  </div>

                  <div className="border-t" style={{ borderColor: 'var(--hc-border)' }} />

                  {/* Stock */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#8e8e9a]">Disponibilidad</label>
                    <div className="space-y-0.5">
                      {STOCK_OPTIONS.map(({ value, label }) => (
                        <FilterBtn key={value} active={filterStock === value} onClick={() => setFilterStock(value)}>
                          {label}
                        </FilterBtn>
                      ))}
                    </div>
                  </div>

                  <div className="border-t" style={{ borderColor: 'var(--hc-border)' }} />

                  {/* Price range */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#8e8e9a]">Precio (₡)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Mín"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        className="w-full h-8 rounded-lg px-2 text-xs bg-white/5 border text-[#e8e8ed] placeholder-[#8e8e9a] outline-none focus:border-[#4f7cff]/60 transition-colors"
                        style={{ borderColor: 'var(--hc-border)' }}
                      />
                      <input
                        type="number"
                        placeholder="Máx"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        className="w-full h-8 rounded-lg px-2 text-xs bg-white/5 border text-[#e8e8ed] placeholder-[#8e8e9a] outline-none focus:border-[#4f7cff]/60 transition-colors"
                        style={{ borderColor: 'var(--hc-border)' }}
                      />
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
          </div>

          {/* Right: search + sort + grid */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Search + sort bar */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e9a] z-10 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder={t('products.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="hc-input pl-10 pr-4"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="hc-input px-3 cursor-pointer shrink-0"
                style={{ width: 'auto' }}
              >
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Active filter chips */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    onClick={chip.clear}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-80"
                    style={{ background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)', borderColor: 'color-mix(in srgb, var(--hc-accent) 28%, transparent)' }}
                  >
                    {chip.label}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ))}
                {activeChips.length > 1 && (
                  <button onClick={clearFilters} className="text-xs text-[#8e8e9a] hover:text-[#4f7cff] transition-colors underline">
                    Limpiar todo
                  </button>
                )}
              </div>
            )}

            {/* Product grid */}
            <div ref={productGridRef}>
            {!shouldRenderGrid ? (
              <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
            ) : loading ? (
              <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-5">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-3xl" style={{ background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 16%, transparent)' }} />
                  <svg className="relative w-12 h-12 text-[#4f7cff]" fill="none" stroke="currentColor" strokeWidth={1.3} viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-base mb-1" style={{ color: 'var(--hc-text)' }}>{t('products.noResults')}</p>
                  <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Intenta con otros filtros o busca por nombre</p>
                </div>
                {(search || hasFilters) && (
                  <button
                    onClick={clearFilters}
                    className="px-5 py-2 rounded-xl border text-sm font-medium transition-colors hover:bg-white/5"
                    style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}
                  >
                    {t('common.clear')}
                  </button>
                )}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={page + search + category + marca + sort + filterStock + filterCond + priceMin + priceMax}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
                >
                  {filtered.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      priority={i < 4}
                      index={i}
                      onQuickView={setQuickView}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Pagination */}
            {totalPages > 1 && !search && !hasFilters && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => fetchProducts(page - 1)}
                  disabled={page === 0}
                  className="hc-btn hc-btn-outline hc-btn-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t('common.previous')}
                </button>
                <span className="text-sm px-2" style={{ color: 'var(--hc-muted)' }}>{page + 1} / {totalPages}</span>
                <button
                  onClick={() => fetchProducts(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="hc-btn hc-btn-outline hc-btn-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t('common.next')}
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {quickView && (
          <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
        )}
      </AnimatePresence>
    </MainLayout>
  )
}

function ChipBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200"
      style={active
        ? { background: 'color-mix(in srgb, var(--hc-accent) 15%, transparent)', color: 'var(--hc-text)', borderColor: 'color-mix(in srgb, var(--hc-accent) 40%, transparent)' }
        : { color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }
      }
    >
      {children}
    </button>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200"
      style={active
        ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-text)', border: '1px solid color-mix(in srgb, var(--hc-accent) 28%, transparent)' }
        : { color: 'var(--hc-muted)', border: '1px solid transparent' }
      }
    >
      {children}
    </button>
  )
}

function FilterIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
    </svg>
  )
}
