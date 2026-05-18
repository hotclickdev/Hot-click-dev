import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { productService, normalizeProduct } from '@/services/productService'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, conditionLabel } from '@/utils/format'
import Spinner from '@/components/ui/Spinner'

const PAGE_SIZE = 24

export default function ProductsPage() {
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()
  const { t } = useTranslation()

  const SORT_OPTIONS = [
    { value: 'default', label: t('products.sortBy') },
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
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('default')
  const [filterStock, setFilterStock] = useState('')
  const [filterCond, setFilterCond] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

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
  }, [])

  const filtered = useMemo(() => products
    .filter((p) => !search || p.nombre?.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => !category || String(p.categoriaId) === String(category))
    .filter((p) => {
      if (filterStock === 'ok') return p.stock > 3
      if (filterStock === 'low') return p.stock > 0 && p.stock <= 3
      if (filterStock === 'out') return p.stock === 0
      return true
    })
    .filter((p) => !filterCond || p.condicion === filterCond)
    .sort((a, b) => {
      if (sort === 'price_asc') return a.precio - b.precio
      if (sort === 'price_desc') return b.precio - a.precio
      if (sort === 'name') return a.nombre?.localeCompare(b.nombre)
      return 0
    }), [products, search, category, sort, filterStock, filterCond])

  const hasFilters = category || filterStock || filterCond
  const clearFilters = () => { setCategory(''); setFilterStock(''); setFilterCond(''); setSearch('') }

  const handleAdd = (e, product) => {
    e.stopPropagation()
    addItem(product)
    toast({ message: t('product.added', { name: product.nombre }), type: 'success' })
  }

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
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e9a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
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

            {/* Product grid */}
            {loading ? (
              <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-6xl mb-4 opacity-20">🔍</span>
                <p className="text-[#8e8e9a]">{t('products.noResults')}</p>
                {(search || hasFilters) && (
                  <button onClick={clearFilters} className="mt-3 text-sm text-[#4f7cff] hover:underline">
                    {t('common.clear')}
                  </button>
                )}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={page + search + category + sort + filterStock + filterCond}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
                >
                  {filtered.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
                      whileHover={{ y: -6 }}
                      className="group hc-card hc-card-glow rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                      onClick={() => navigate(`/productos/${product.id}`, { state: { product } })}
                    >
                      {/* Image */}
                      <div className="relative h-36 sm:h-48 bg-[#1a1a1f] flex items-center justify-center overflow-hidden">
                        {product.imagenUrl ? (
                          <img
                            src={product.imagenUrl}
                            alt={product.nombre}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                            loading="lazy"
                          />
                        ) : (
                          <svg className="w-12 h-12 text-[#8e8e9a]/20 group-hover:opacity-40 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                          </svg>
                        )}
                        {product.stock === 0 && (
                          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                            <span className="text-xs font-medium text-white/70 bg-black/50 px-3 py-1 rounded-full">{t('products.outOfStock')}</span>
                          </div>
                        )}
                        {product.condicion && product.condicion !== 'NUEVO' && (
                          <div className="absolute top-2 left-2">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">
                              {conditionLabel(product.condicion)}
                            </span>
                          </div>
                        )}
                        {/* Quick-add overlay */}
                        {product.stock > 0 && (
                          <>
                            <div className="hc-card-overlay" />
                            <div className="hc-quick-add absolute bottom-0 left-0 right-0 p-2">
                              <button
                                onClick={(e) => handleAdd(e, product)}
                                className="w-full h-8 rounded-xl bg-[#4f7cff] text-white text-xs font-bold"
                              >
                                + {t('products.addToCart')}
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3 sm:p-4">
                        <h3 className="font-medium text-xs sm:text-sm leading-snug line-clamp-2 mb-2 sm:mb-2.5 group-hover:text-white transition-colors" style={{ color: 'var(--hc-text)' }}>
                          {product.nombre}
                        </h3>
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <span className="font-bold text-sm sm:text-base" style={{ color: 'var(--hc-text)' }}>{formatPrice(product.precio)}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${product.stock === 0 ? 'bg-red-400' : product.stock <= 3 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                            <span className={`text-[10px] sm:text-xs font-medium ${
                              product.stock === 0 ? 'text-red-400' :
                              product.stock <= 3 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {product.stock === 0
                                ? t('products.outOfStock')
                                : product.stock <= 3
                                ? t('products.lowStock', { count: product.stock })
                                : t('products.inStock')}
                            </span>
                          </div>
                        </div>
                        {product.stock > 0 && (
                          <button
                            onClick={(e) => handleAdd(e, product)}
                            className="sm:hidden hc-btn hc-btn-ghost w-full h-8 text-xs"
                          >
                            {t('products.addToCart')}
                          </button>
                        )}
                      </div>
                    </motion.div>
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
