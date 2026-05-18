import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import useUiStore from '@/store/uiStore'
import { productService, normalizeProduct } from '@/services/productService'
import { formatPrice } from '@/utils/format'
import { analytics } from '@/utils/analytics'

const RECENT_KEY = 'hotclick-recent-searches'
const MAX_RECENT = 6

// Module-level cache: survives open/close cycles without re-fetching
let _productCache = null

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

function saveRecent(query) {
  if (!query.trim()) return
  const next = [query.trim(), ...getRecent().filter((s) => s !== query.trim())].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

export default function SearchPanel() {
  const searchOpen = useUiStore((s) => s.searchOpen)
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)
  const navigate = useNavigate()
  const location = useLocation()

  const [query, setQuery] = useState('')
  const [allProducts, setAllProducts] = useState(_productCache ?? [])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState([])
  const inputRef = useRef(null)
  const analyticsTimer = useRef(null)

  // Close on route change
  useEffect(() => { setSearchOpen(false) }, [location.pathname])

  // On open: load products (module-level cache avoids re-fetch) + recent searches
  useEffect(() => {
    if (!searchOpen) { setQuery(''); return }
    setRecent(getRecent())
    if (_productCache) {
      setTimeout(() => inputRef.current?.focus(), 60)
      return
    }
    setLoading(true)
    productService.getAll(0, 60)
      .then(({ data }) => {
        const products = (data.content ?? data ?? []).map(normalizeProduct)
        _productCache = products
        setAllProducts(products)
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        setTimeout(() => inputRef.current?.focus(), 60)
      })
  }, [searchOpen])

  // Keyboard close
  useEffect(() => {
    if (!searchOpen) return
    const handler = (e) => { if (e.key === 'Escape') setSearchOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [searchOpen])

  // Debounced analytics
  useEffect(() => {
    clearTimeout(analyticsTimer.current)
    if (query.trim().length > 1) {
      analyticsTimer.current = setTimeout(() => {
        analytics.searchQuery(query.trim(), results.length)
      }, 900)
    }
    return () => clearTimeout(analyticsTimer.current)
  }, [query])

  const results = useMemo(() => {
    if (!query.trim() || !allProducts.length) return []
    const q = query.toLowerCase()
    return allProducts
      .filter((p) =>
        p.nombre?.toLowerCase().includes(q) ||
        p.categoriaNombre?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [query, allProducts])

  const close = () => setSearchOpen(false)

  const selectProduct = (product) => {
    saveRecent(query.trim() || product.nombre)
    close()
    navigate(`/productos/${product.id}`)
  }

  const viewAll = () => {
    if (query.trim()) saveRecent(query.trim())
    close()
    navigate('/productos')
  }

  const clearRecent = () => {
    localStorage.removeItem(RECENT_KEY)
    setRecent([])
  }

  return (
    <AnimatePresence>
      {searchOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel — full screen on mobile, floating on desktop */}
          <div className="fixed inset-0 z-[51] flex flex-col md:block pointer-events-none">
            <motion.div
              key="search-panel"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="pointer-events-auto flex flex-col w-full md:max-w-2xl md:mx-auto md:mt-[72px] rounded-b-3xl md:rounded-3xl overflow-hidden"
              style={{
                background: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
                maxHeight: '82vh',
              }}
            >
              {/* Input row */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'var(--hc-border)' }}>
                {loading ? (
                  <div className="w-5 h-5 shrink-0 rounded-full border-2 border-[#4f7cff] border-t-transparent animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" style={{ color: 'var(--hc-muted)' }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') viewAll() }}
                  placeholder="Buscar productos, categorías..."
                  className="flex-1 bg-transparent text-base outline-none placeholder:opacity-40"
                  style={{ color: 'var(--hc-text)' }}
                  autoComplete="off"
                  spellCheck={false}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="p-1 rounded-lg transition-colors hover:bg-white/8"
                    style={{ color: 'var(--hc-muted)' }}
                    aria-label="Limpiar búsqueda"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={close}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-sm transition-colors hover:bg-white/8"
                  style={{ color: 'var(--hc-muted)' }}
                >
                  Cancelar
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1">

                {/* Recent searches — shown when no query */}
                {!query && recent.length > 0 && (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>
                        Búsquedas recientes
                      </span>
                      <button onClick={clearRecent} className="text-xs text-[#4f7cff] hover:underline">
                        Limpiar
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recent.map((s) => (
                        <button
                          key={s}
                          onClick={() => setQuery(s)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-colors hover:bg-white/5"
                          style={{ color: 'var(--hc-text)', borderColor: 'var(--hc-border)' }}
                        >
                          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--hc-muted)' }}>
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0 .49-3.46" />
                          </svg>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty — no query, no recent */}
                {!query && recent.length === 0 && !loading && (
                  <div className="py-12 text-center">
                    <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Escribe para buscar productos</p>
                  </div>
                )}

                {/* Results */}
                {query.trim() && (
                  <>
                    {results.length === 0 && !loading && (
                      <div className="py-12 text-center px-6">
                        <p className="font-semibold text-sm mb-1" style={{ color: 'var(--hc-text)' }}>
                          Sin resultados para "{query}"
                        </p>
                        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                          Intenta con otras palabras o revisa la ortografía
                        </p>
                        <button
                          onClick={viewAll}
                          className="mt-4 px-5 py-2 rounded-xl text-sm border transition-colors hover:bg-white/5"
                          style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}
                        >
                          Ver todos los productos
                        </button>
                      </div>
                    )}

                    {results.length > 0 && (
                      <>
                        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>
                            {results.length} resultado{results.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {results.map((product, i) => (
                          <motion.button
                            key={product.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.035 }}
                            onClick={() => selectProduct(product)}
                            className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 text-left"
                          >
                            {/* Image */}
                            <div className="w-12 h-12 rounded-xl bg-[#1a1a1f] flex items-center justify-center overflow-hidden shrink-0 border border-white/8">
                              {product.imagenUrl ? (
                                <img src={product.imagenUrl} alt={product.nombre} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <span className="text-xl opacity-25">📦</span>
                              )}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: 'var(--hc-text)' }}>
                                {product.nombre}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {product.categoriaNombre && (
                                  <span className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>
                                    {product.categoriaNombre}
                                  </span>
                                )}
                                <span className={`text-[10px] font-medium flex items-center gap-1 ${product.stock === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                  <span className={`w-1 h-1 rounded-full ${product.stock === 0 ? 'bg-red-400' : 'bg-emerald-400'}`} />
                                  {product.stock === 0 ? 'Sin stock' : 'En stock'}
                                </span>
                              </div>
                            </div>
                            {/* Price */}
                            <span className="font-bold text-sm text-[#4f7cff] shrink-0">
                              {formatPrice(product.precio)}
                            </span>
                          </motion.button>
                        ))}

                        {/* View all */}
                        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--hc-border)' }}>
                          <button
                            onClick={viewAll}
                            className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
                            style={{ background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 25%, transparent)' }}
                          >
                            Ver todos los resultados para "{query}" →
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
