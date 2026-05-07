import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'
import { productService, normalizeProduct } from '@/services/productService'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, conditionLabel } from '@/utils/format'
import Spinner from '@/components/ui/Spinner'

const PAGE_SIZE = 24

const SORT_OPTIONS = [
  { value: 'default', label: 'Relevancia' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'name', label: 'Nombre A-Z' },
]

const STOCK_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'ok', label: 'En stock' },
  { value: 'low', label: 'Últimas unidades' },
  { value: 'out', label: 'Agotado' },
]

const COND_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'NUEVO', label: 'Nuevo' },
  { value: 'COMO_NUEVO', label: 'Como nuevo' },
  { value: 'USADO', label: 'Usado' },
]

export default function ProductsPage() {
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()

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
    toast({ message: `${product.nombre} añadido al carrito`, type: 'success' })
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
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#111114] border-t border-white/10 rounded-t-3xl md:hidden"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-4">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="px-5 pb-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#e8e8ed]">Filtros</span>
                  <div className="flex items-center gap-3">
                    {hasFilters && (
                      <button onClick={clearFilters} className="text-xs text-[#4f7cff]">Limpiar</button>
                    )}
                    <button onClick={() => setFilterDrawerOpen(false)} className="text-xs text-[#8e8e9a] hover:text-white">Cerrar</button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">Categoría</label>
                  <div className="flex flex-wrap gap-2">
                    <ChipBtn active={category === ''} onClick={() => setCategory('')}>Todas</ChipBtn>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-[#e8e8ed]">Productos</h1>
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
            Filtrar
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
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-4 space-y-5 sticky top-24">
                  {/* Filter header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Filtros</span>
                    {hasFilters && (
                      <button onClick={clearFilters} className="text-[10px] text-[#4f7cff] hover:underline">Limpiar</button>
                    )}
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#8e8e9a]">Categoría</label>
                    <div className="space-y-0.5">
                      <FilterBtn active={category === ''} onClick={() => setCategory('')}>Todas</FilterBtn>
                      {categories.map((c) => (
                        <FilterBtn key={c.id} active={String(category) === String(c.id)} onClick={() => setCategory(c.id)}>
                          {c.nombreCategoria ?? c.nombre}
                        </FilterBtn>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-white/6" />

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

                  <div className="border-t border-white/6" />

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
                  placeholder="Buscar productos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-[#111114] border border-white/10 rounded-xl text-sm text-[#e8e8ed] placeholder:text-[#8e8e9a]/60 focus:outline-none focus:border-[#4f7cff]/60 transition-colors"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-10 px-3 bg-[#111114] border border-white/10 rounded-xl text-sm text-[#e8e8ed] focus:outline-none focus:border-[#4f7cff]/60 cursor-pointer shrink-0"
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
                <p className="text-[#8e8e9a]">No se encontraron productos</p>
                {(search || hasFilters) && (
                  <button onClick={clearFilters} className="mt-3 text-sm text-[#4f7cff] hover:underline">
                    Limpiar filtros
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
                      whileHover={{ y: -3 }}
                      className="group bg-[#111114] border border-white/8 rounded-2xl overflow-hidden cursor-pointer hover:border-white/15 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300"
                      onClick={() => navigate(`/productos/${product.id}`, { state: { product } })}
                    >
                      {/* Image */}
                      <div className="relative h-36 sm:h-48 bg-[#1a1a1f] flex items-center justify-center overflow-hidden">
                        {product.imagenUrl ? (
                          <img
                            src={product.imagenUrl}
                            alt={product.nombre}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <svg className="w-12 h-12 text-[#8e8e9a]/20 group-hover:opacity-40 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                          </svg>
                        )}
                        {product.stock === 0 && (
                          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                            <span className="text-xs font-medium text-white/70 bg-black/50 px-3 py-1 rounded-full">Agotado</span>
                          </div>
                        )}
                        {product.condicion && product.condicion !== 'NUEVO' && (
                          <div className="absolute top-2 left-2">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">
                              {conditionLabel(product.condicion)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3 sm:p-4">
                        <h3 className="font-medium text-[#e8e8ed] text-xs sm:text-sm leading-snug line-clamp-2 mb-2 sm:mb-3">
                          {product.nombre}
                        </h3>
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <span className="font-bold text-[#e8e8ed] text-sm sm:text-base">{formatPrice(product.precio)}</span>
                          <span className={`text-[10px] sm:text-xs font-medium ${
                            product.stock === 0 ? 'text-red-400' :
                            product.stock <= 3 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {product.stock === 0 ? 'Agotado' :
                             product.stock <= 3 ? `${product.stock} disp.` : 'Stock'}
                          </span>
                        </div>
                        {product.stock > 0 && (
                          <button
                            onClick={(e) => handleAdd(e, product)}
                            className="w-full h-8 sm:h-9 rounded-xl bg-[#4f7cff]/10 hover:bg-[#4f7cff] border border-[#4f7cff]/20 hover:border-[#4f7cff] text-[#4f7cff] hover:text-white text-xs sm:text-sm font-medium transition-all duration-200"
                          >
                            + Añadir
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
                  className="px-4 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-[#8e8e9a] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ← Anterior
                </button>
                <span className="text-sm text-[#8e8e9a] px-2">{page + 1} / {totalPages}</span>
                <button
                  onClick={() => fetchProducts(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-[#8e8e9a] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Siguiente →
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
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        active
          ? 'bg-[#4f7cff]/15 text-white border-[#4f7cff]/40'
          : 'text-[#8e8e9a] border-white/10 hover:text-white hover:border-white/20'
      }`}
    >
      {children}
    </button>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
        active
          ? 'bg-[#4f7cff]/15 text-white border border-[#4f7cff]/20'
          : 'text-[#8e8e9a] hover:text-white hover:bg-white/5'
      }`}
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
