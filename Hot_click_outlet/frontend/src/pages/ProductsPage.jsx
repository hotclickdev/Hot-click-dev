import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import { productService, normalizeProduct } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import Spinner from '@/components/ui/Spinner'
import QuickViewModal from '@/components/ui/QuickViewModal'
import ProductCard from '@/components/ui/ProductCard'
import useLazyLoad from '@/hooks/useLazyLoad'
import { formatPrice } from '@/utils/format'
import useCartStore from '@/store/cartStore'
import { generateItemListJsonLd } from '@/utils/jsonLd'
import ProductsAssistantPanel from '@/components/ai/ProductsAssistantPanel'

const PAGE_SIZE = 24

// ── Utilidad: construir árbol de categorías ───────────────────────────────────
function buildCategoryTree(cats) {
  const roots = cats.filter(c => !c.padreId && !c.categoriaPadre && !c.parentId)
  const children = (parentId) =>
    cats.filter(c => String(c.padreId ?? c.categoriaPadre?.id ?? c.parentId ?? '') === String(parentId))
  return roots.map(r => ({ ...r, children: children(r.id) }))
}

// ── Dropdown base con cierre al click afuera ──────────────────────────────────
function Dropdown({ trigger, children, align = 'left', width = 320 }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const panelRef = useRef(null)
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (!open) return
    const fn = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  const handleToggle = () => {
    if (ref.current) setRect(ref.current.getBoundingClientRect())
    setOpen(v => !v)
  }

  const top = rect ? rect.bottom + window.scrollY + 8 : 0
  const left = rect && align !== 'right' ? rect.left + window.scrollX : undefined
  const right = rect && align === 'right' ? window.innerWidth - rect.right : undefined

  return (
    <div className="relative shrink-0" ref={ref}>
      {trigger(open, handleToggle)}
      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              style={{
                position: 'absolute',
                top,
                ...(left !== undefined ? { left } : {}),
                ...(right !== undefined ? { right } : {}),
                background: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                zIndex: 9999,
                width,
                maxWidth: 'calc(100vw - 1.5rem)',
                borderRadius: '1rem',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden',
              }}
            >
              {children(() => setOpen(false))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

// ── Dropdown de categorías — pills horizontales ───────────────────────────────
function CategoryDropdown({ categories, category, setCategory }) {
  const [expandedParent, setExpandedParent] = useState(null)
  const tree = useMemo(() => buildCategoryTree(categories), [categories])

  const activeCat = categories.find(c => String(c.id) === String(category))
  const label = activeCat ? (activeCat.nombreCategoria ?? activeCat.nombre) : 'Categoría'
  const isActive = !!category

  const pillBase = {
    border: '1.5px solid var(--hc-border)',
    borderRadius: '999px',
    padding: '5px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  }
  const pillActive = { ...pillBase, background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)', borderColor: 'color-mix(in srgb, var(--hc-accent) 35%, transparent)' }
  const pillInactive = { ...pillBase, background: 'var(--hc-surface-2)', color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }

  return (
    <Dropdown
      width={560}
      trigger={(open, toggle) => (
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
          style={isActive || open
            ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)', border: '1.5px solid color-mix(in srgb, var(--hc-accent) 30%, transparent)' }
            : { background: 'var(--hc-surface)', color: 'var(--hc-text)', border: '1.5px solid var(--hc-border)' }
          }
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
          <span className="max-w-[110px] truncate">{label}</span>
          <svg className="w-3 h-3 shrink-0 opacity-50" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    >
      {(close) => (
        <div className="p-4 space-y-4">
          {/* Row de categorías padre */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--hc-muted)' }}>Categorías</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setCategory(''); setExpandedParent(null); close() }}
                style={!category ? pillActive : pillInactive}
              >
                Todas
              </button>
              {tree.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (cat.children.length > 0) {
                      setExpandedParent(expandedParent === cat.id ? null : cat.id)
                    } else {
                      setCategory(cat.id); setExpandedParent(null); close()
                    }
                  }}
                  style={String(category) === String(cat.id) || expandedParent === cat.id ? pillActive : pillInactive}
                >
                  {cat.nombreCategoria ?? cat.nombre}
                  {cat.children.length > 0 && <span className="ml-1 opacity-60">›</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategorías del padre expandido */}
          {expandedParent && (() => {
            const subs = tree.find(c => c.id === expandedParent)?.children ?? []
            if (!subs.length) return null
            return (
              <div>
                <div className="h-px mb-3" style={{ background: 'var(--hc-border)' }} />
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--hc-muted)' }}>
                  {tree.find(c => c.id === expandedParent)?.nombreCategoria ?? 'Subcategorías'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {subs.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => { setCategory(sub.id); setExpandedParent(null); close() }}
                      style={String(category) === String(sub.id) ? pillActive : pillInactive}
                    >
                      {sub.nombreCategoria ?? sub.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </Dropdown>
  )
}

// ── Dropdown de marcas con logos + búsqueda + multi-select ────────────────────
function BrandDropdown({ marcas, marcasFilter, toggleMarca, clearMarcas, marcaProductCount, filteredCount }) {
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  const visible = search
    ? marcas.filter(m => m.nombreMarca?.toLowerCase().includes(search.toLowerCase()))
    : marcas

  const isActive = marcasFilter.size > 0
  const label = marcasFilter.size === 0
    ? 'Marca'
    : marcasFilter.size === 1
      ? marcas.find(m => marcasFilter.has(String(m.id)))?.nombreMarca ?? 'Marca'
      : `${marcasFilter.size} marcas`

  return (
    <Dropdown
      width={340}
      trigger={(open, toggle) => (
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
          style={isActive || open
            ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)', border: '1.5px solid color-mix(in srgb, var(--hc-accent) 30%, transparent)' }
            : { background: 'var(--hc-surface)', color: 'var(--hc-text)', border: '1.5px solid var(--hc-border)' }
          }
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="max-w-[100px] truncate">{label}</span>
          {isActive && (
            <span className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white shrink-0"
              style={{ background: 'var(--hc-accent)' }}>{marcasFilter.size}</span>
          )}
          <svg className="w-3 h-3 shrink-0 opacity-50" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    >
      {(close) => (
        <div className="p-3 space-y-3">
          {/* Búsqueda */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar marca..."
              className="w-full h-8 rounded-lg pl-8 pr-3 text-xs outline-none"
              style={{ background: 'color-mix(in srgb, var(--hc-text) 6%, transparent)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
            />
          </div>

          {/* Grid de marcas */}
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin' }}>
            {visible.map(m => {
              const sel = marcasFilter.has(String(m.id))
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMarca(String(m.id))}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all"
                  style={sel
                    ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', border: '1.5px solid color-mix(in srgb, var(--hc-accent) 35%, transparent)' }
                    : { background: 'color-mix(in srgb, var(--hc-text) 4%, transparent)', border: '1.5px solid transparent' }
                  }
                >
                  {/* Checkbox */}
                  <span className="w-4 h-4 rounded-md shrink-0 flex items-center justify-center border transition-all"
                    style={sel
                      ? { background: 'var(--hc-accent)', borderColor: 'var(--hc-accent)' }
                      : { borderColor: 'var(--hc-border)' }
                    }
                  >
                    {sel && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                  </span>
                  {/* Logo */}
                  {m.logoUrl
                    ? <img src={m.logoUrl} alt="" className="w-6 h-6 object-contain rounded-md shrink-0" onError={e => e.target.style.display='none'} />
                    : <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shrink-0"
                        style={{ background: 'color-mix(in srgb, var(--hc-accent) 15%, transparent)', color: 'var(--hc-accent)' }}>
                        {m.nombreMarca?.[0]}
                      </span>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--hc-text)' }}>{m.nombreMarca}</p>
                    {marcaProductCount[m.id] > 0 && (
                      <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>{marcaProductCount[m.id]} productos</p>
                    )}
                  </div>
                </button>
              )
            })}
            {visible.length === 0 && (
              <p className="col-span-2 text-center text-xs py-4" style={{ color: 'var(--hc-muted)' }}>Sin resultados</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--hc-border)' }}>
            {marcasFilter.size > 0 && (
              <button onClick={clearMarcas} className="text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--hc-muted)' }}>
                Limpiar
              </button>
            )}
            <button
              onClick={close}
              className="flex-1 h-9 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--hc-accent)' }}
            >
              Ver {filteredCount} resultado{filteredCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </Dropdown>
  )
}

// ── Dropdown de filtros extra ─────────────────────────────────────────────────
function MoreFiltersDropdown({
  filterCond, setFilterCond, filterStock, setFilterStock,
  filterTalla, setFilterTalla, priceMin, setPriceMin, priceMax, setPriceMax,
  COND_OPTIONS, STOCK_OPTIONS, tallaOptions, filteredCount,
}) {
  const extraCount = [filterCond, filterStock, filterTalla, priceMin, priceMax]
    .filter(v => v !== '' && v != null).length

  const clearExtra = () => {
    setFilterCond(''); setFilterStock(''); setFilterTalla(''); setPriceMin(''); setPriceMax('')
  }

  return (
    <Dropdown
      width={280}
      trigger={(open, toggle) => (
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
          style={extraCount > 0 || open
            ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)', border: '1.5px solid color-mix(in srgb, var(--hc-accent) 30%, transparent)' }
            : { background: 'var(--hc-surface)', color: 'var(--hc-text)', border: '1.5px solid var(--hc-border)' }
          }
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          <span>Filtros</span>
          {extraCount > 0 && (
            <span className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white shrink-0"
              style={{ background: 'var(--hc-accent)' }}>{extraCount}</span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>Filtros</span>
            {extraCount > 0 && (
              <button onClick={clearExtra} className="text-xs font-semibold hover:opacity-70" style={{ color: 'var(--hc-accent)' }}>Limpiar</button>
            )}
          </div>

          {/* Condición */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--hc-muted)' }}>Condición</p>
            <div className="flex flex-wrap gap-1.5">
              {COND_OPTIONS.map(({ value, label }) => (
                <FPill key={value} active={filterCond === value} onClick={() => setFilterCond(value)}>{label}</FPill>
              ))}
            </div>
          </div>

          {/* Disponibilidad */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--hc-muted)' }}>Disponibilidad</p>
            <div className="flex flex-wrap gap-1.5">
              {STOCK_OPTIONS.map(({ value, label }) => (
                <FPill key={value} active={filterStock === value} onClick={() => setFilterStock(value)}>{label}</FPill>
              ))}
            </div>
          </div>

          {/* Tallas */}
          {(tallaOptions.ropa.length > 0 || tallaOptions.zapatos.length > 0) && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--hc-muted)' }}>Talla</p>
              {tallaOptions.ropa.length > 0 && (
                <div className="mb-2">
                  <p className="text-[9px] uppercase tracking-wider mb-1 opacity-50" style={{ color: 'var(--hc-muted)' }}>👕 Ropa</p>
                  <div className="flex flex-wrap gap-1">
                    {tallaOptions.ropa.map(t => (
                      <FPill key={t} active={filterTalla === t} onClick={() => setFilterTalla(filterTalla === t ? '' : t)}>{t}</FPill>
                    ))}
                  </div>
                </div>
              )}
              {tallaOptions.zapatos.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-wider mb-1 opacity-50" style={{ color: 'var(--hc-muted)' }}>👟 Zapatos</p>
                  <div className="flex flex-wrap gap-1">
                    {tallaOptions.zapatos.map(t => (
                      <FPill key={t} active={filterTalla === t} onClick={() => setFilterTalla(filterTalla === t ? '' : t)}>{t}</FPill>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Precio */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--hc-muted)' }}>Precio</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: 'var(--hc-muted)' }}>₡</span>
                <input type="number" placeholder="Mín" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                  className="w-full h-9 rounded-xl pl-7 pr-2 text-xs outline-none"
                  style={{ background: 'color-mix(in srgb, var(--hc-text) 5%, transparent)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
              </div>
              <span className="self-center text-xs" style={{ color: 'var(--hc-muted)' }}>—</span>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: 'var(--hc-muted)' }}>₡</span>
                <input type="number" placeholder="Máx" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                  className="w-full h-9 rounded-xl pl-7 pr-2 text-xs outline-none"
                  style={{ background: 'color-mix(in srgb, var(--hc-text) 5%, transparent)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
              </div>
            </div>
          </div>

          <button onClick={close}
            className="w-full h-9 rounded-xl font-bold text-xs text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--hc-accent)' }}>
            Ver {filteredCount} resultado{filteredCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </Dropdown>
  )
}

function FPill({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
      style={active
        ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)', borderColor: 'color-mix(in srgb, var(--hc-accent) 30%, transparent)' }
        : { color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }
      }
    >{children}</button>
  )
}

// ── Barra de filtros completa ─────────────────────────────────────────────────
function CatalogFilterBar({
  search, setSearch, sort, setSort,
  categories, marcas, marcaProductCount, tallaOptions,
  category, setCategory,
  marcasFilter, toggleMarca, clearMarcas,
  filterCond, setFilterCond, filterStock, setFilterStock,
  filterTalla, setFilterTalla, priceMin, setPriceMin, priceMax, setPriceMax,
  hasFilters, clearFilters, COND_OPTIONS, STOCK_OPTIONS, SORT_OPTIONS, filteredCount,
  onOpenSidebar,
}) {
  return (
    <div className="sticky top-0 z-30 backdrop-blur-xl"
      style={{ background: 'color-mix(in srgb, var(--hc-bg) 92%, transparent)', borderBottom: '1px solid var(--hc-border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">

          {/* Búsqueda */}
          <div className="relative flex-1 min-w-0 w-full sm:w-auto">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="hc-input w-full"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          {/* Dropdowns */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5 sm:pb-0">
            {/* Mobile: botón abre sidebar drawer */}
            <button
              onClick={onOpenSidebar}
              className="flex lg:hidden items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-semibold border shrink-0 transition-all hover:opacity-80"
              style={{ color: 'var(--hc-text)', borderColor: 'var(--hc-border)', background: 'var(--hc-surface)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7"/>
              </svg>
              Filtrar
            </button>

            {/* Desktop: dropdowns de categoría y marca (en sidebar en desktop, aquí en mobile) */}
            <div className="hidden lg:flex items-center gap-2">
              <CategoryDropdown
                categories={categories}
                category={category}
                setCategory={setCategory}
              />
              <BrandDropdown
                marcas={marcas}
                marcasFilter={marcasFilter}
                toggleMarca={toggleMarca}
                clearMarcas={clearMarcas}
                marcaProductCount={marcaProductCount}
                filteredCount={filteredCount}
              />
            </div>

            <MoreFiltersDropdown
              filterCond={filterCond} setFilterCond={setFilterCond}
              filterStock={filterStock} setFilterStock={setFilterStock}
              filterTalla={filterTalla} setFilterTalla={setFilterTalla}
              priceMin={priceMin} setPriceMin={setPriceMin}
              priceMax={priceMax} setPriceMax={setPriceMax}
              COND_OPTIONS={COND_OPTIONS} STOCK_OPTIONS={STOCK_OPTIONS}
              tallaOptions={tallaOptions} filteredCount={filteredCount}
            />

            {/* Ordenar */}
            <select
              value={sort}
              onChange={e => { setSort(e.target.value); localStorage.setItem('hc-products-sort', e.target.value) }}
              className="h-9 px-3 rounded-xl text-sm font-semibold cursor-pointer outline-none shrink-0"
              style={{ background: 'var(--hc-surface)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)' }}
            >
              {SORT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Limpiar todo */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 h-9 px-3 rounded-xl text-xs font-semibold border transition-all shrink-0 hover:opacity-70"
                style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sidebar de categorías y marcas ───────────────────────────────────────────
function CategorySidebar({
  categories, category, setCategory,
  marcas, marcasFilter, toggleMarca, clearMarcas, marcaProductCount,
  onCategorySelect,
}) {
  const tree = useMemo(() => buildCategoryTree(categories), [categories])
  const [marcaSearch, setMarcaSearch] = useState('')

  function handleCatSelect(id) {
    setCategory(id)
    onCategorySelect?.()
  }

  // Determina el nodo raíz "activo" para el modo drill-down
  const drilledNode = useMemo(() => {
    if (!category) return null
    const activeCat = categories.find(c => String(c.id) === String(category))
    if (!activeCat) return null
    if (activeCat.padreId) {
      return tree.find(r => String(r.id) === String(activeCat.padreId)) ?? null
    }
    const rootNode = tree.find(r => String(r.id) === String(activeCat.id))
    return rootNode?.children?.length > 0 ? rootNode : null
  }, [category, categories, tree])

  const visibleMarcas = marcaSearch.trim()
    ? marcas.filter(m => m.nombreMarca?.toLowerCase().includes(marcaSearch.toLowerCase()))
    : marcas

  return (
    <div className="space-y-6">
      {/* Categorías */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-1"
          style={{ color: 'var(--hc-muted)' }}>Categorías</p>
        <div className="space-y-0.5">
          {drilledNode ? (
            /* ── Modo drill-down: muestra solo la categoría padre + sus hijos ── */
            <>
              <button
                onClick={() => handleCatSelect('')}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 mb-1"
                style={{ color: 'var(--hc-muted)' }}
              >
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
                Todas las categorías
              </button>
              {/* Padre */}
              <button
                onClick={() => handleCatSelect(String(drilledNode.id))}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                style={String(category) === String(drilledNode.id)
                  ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)' }
                  : { color: 'var(--hc-text)' }
                }
              >
                {drilledNode.icono && <span className="text-base leading-none">{drilledNode.icono}</span>}
                <span className="truncate">{drilledNode.nombreCategoria ?? drilledNode.nombre}</span>
              </button>
              {/* Hijos */}
              <div className="pl-3 mt-0.5 space-y-0.5">
                {drilledNode.children.map(sub => (
                  <button key={sub.id}
                    onClick={() => handleCatSelect(String(sub.id))}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                    style={String(category) === String(sub.id)
                      ? { background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)' }
                      : { color: 'var(--hc-muted)' }
                    }
                  >
                    {sub.icono && <span className="text-sm leading-none">{sub.icono}</span>}
                    {sub.nombreCategoria ?? sub.nombre}
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* ── Vista normal: todas las categorías ── */
            <>
              <button
                onClick={() => handleCatSelect('')}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={!category
                  ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)' }
                  : { color: 'var(--hc-text-2, var(--hc-text))' }
                }
              >
                Todos los productos
              </button>
              {tree.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCatSelect(String(cat.id))}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 group"
                  style={String(category) === String(cat.id)
                    ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)' }
                    : { color: 'var(--hc-text)' }
                  }
                >
                  {cat.icono && <span className="text-base leading-none shrink-0">{cat.icono}</span>}
                  <span className="truncate flex-1">{cat.nombreCategoria ?? cat.nombre}</span>
                  {cat.children?.length > 0 && (
                    <svg className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                      fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Marcas */}
      {marcas.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-1 mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--hc-muted)' }}>Marcas</p>
            {marcasFilter.size > 0 && (
              <button onClick={clearMarcas}
                className="text-[10px] underline transition-opacity hover:opacity-70"
                style={{ color: 'var(--hc-accent)' }}>
                Limpiar
              </button>
            )}
          </div>
          {marcas.length > 5 && (
            <div className="mb-2">
              <input
                value={marcaSearch}
                onChange={e => setMarcaSearch(e.target.value)}
                placeholder="Buscar marca..."
                className="w-full h-7 px-2.5 rounded-lg text-xs outline-none"
                style={{ background: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              />
            </div>
          )}
          <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {visibleMarcas.map(m => {
              const checked = marcasFilter.has(String(m.id))
              const count = marcaProductCount[m.id] ?? 0
              return (
                <label key={m.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all hover:opacity-80"
                  style={checked ? { background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)' } : {}}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMarca(String(m.id))}
                    className="accent-[var(--hc-accent)] shrink-0"
                  />
                  {m.logoUrl && (
                    <img src={m.logoUrl} alt={m.nombreMarca} className="w-5 h-5 object-contain rounded-sm shrink-0"
                      onError={e => { e.target.style.display = 'none' }} />
                  )}
                  <span className="flex-1 truncate text-xs font-medium"
                    style={{ color: checked ? 'var(--hc-accent)' : 'var(--hc-text)' }}>
                    {m.nombreMarca}
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--hc-muted)' }}>{count}</span>
                  )}
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Fila de una categoría (3 productos + Ver más) ─────────────────────────────
function CategoryRow({ catName, catId, products, onVerMas, onQuickView }) {
  const extra = products.length - 3
  const slice = products.slice(0, 3)
  const hasMore = products.length > 3

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase tracking-wide" style={{ color: 'var(--hc-text)' }}>
            {catName}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)' }}>
            {products.length}
          </span>
        </div>
        <button
          onClick={() => onVerMas(catId)}
          className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--hc-accent)' }}
        >
          Ver más
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      {/* Grid: 2 cols mobile, 4 cols sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Primeros 2 productos — siempre visibles */}
        {slice.slice(0, 2).map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} onQuickView={onQuickView} />
        ))}

        {/* 3er producto — solo desktop */}
        {slice[2] && (
          <div className="hidden sm:block">
            <ProductCard product={slice[2]} index={2} onQuickView={onQuickView} />
          </div>
        )}

        {/* Tarjeta "ver todos" — solo desktop, misma estructura que ProductCard */}
        {hasMore && (
          <button
            onClick={() => onVerMas(catId)}
            className="hidden sm:flex flex-col rounded-2xl overflow-hidden transition-all hover:opacity-80 hover:scale-[1.01] text-left"
            style={{
              border: '1.5px dashed color-mix(in srgb, var(--hc-accent) 30%, transparent)',
              background: 'color-mix(in srgb, var(--hc-accent) 5%, var(--hc-surface))',
            }}
          >
            {/* Zona imagen — mismo aspect-square que ProductCard */}
            <div className="aspect-square flex flex-col items-center justify-center gap-1"
              style={{ background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)' }}>
              <span className="text-3xl font-black leading-none" style={{ color: 'var(--hc-accent)' }}>
                +{extra}
              </span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--hc-accent)', opacity: 0.8 }}>
                productos más
              </span>
            </div>
            {/* Zona texto — igual que ProductCard */}
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'color-mix(in srgb, var(--hc-accent) 70%, transparent)' }}>
                  {catName}
                </p>
                <p className="text-sm font-bold line-clamp-2 leading-snug" style={{ color: 'var(--hc-text)' }}>
                  Ver todos los productos
                </p>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--hc-accent)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
                Ver categoría completa
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

// ── Fila de Emprendimientos intercalada ───────────────────────────────────────
function EmprendimientosRow({ products, onVerEmprendimientos }) {
  const slice = products.slice(0, 3)
  if (slice.length === 0) return null
  return (
    <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.07) 0%, rgba(16,185,129,0.02) 100%)', border: '1.5px solid rgba(16,185,129,0.18)' }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🤝</span>
          <span className="text-sm font-black uppercase tracking-wide" style={{ color: '#10b981' }}>Emprendimientos CR</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            {products.length}
          </span>
        </div>
        <button
          onClick={onVerEmprendimientos}
          className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#10b981' }}
        >
          Ver todos
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 pb-4">
        {slice.map((p, i) => (
          <div key={p.id} className="relative">
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
              style={{ background: 'rgba(16,185,129,0.22)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              🤝 Local
            </div>
            <ProductCard product={p} index={i} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Banner Emprendimientos dentro del catálogo ────────────────────────────────
function EmprendimientosBanner({ onClick }) {
  return (
    <motion.div
      className="col-span-full rounded-2xl overflow-hidden cursor-pointer group"
      onClick={onClick}
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.15 }}
      style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0.03) 100%)',
        border: '1.5px solid rgba(16,185,129,0.22)',
      }}
    >
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <span className="text-4xl shrink-0" style={{ filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.35))' }}>🤝</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm sm:text-base" style={{ color: '#10b981' }}>
            Emprendimientos Costarricenses
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--hc-muted)' }}>
            Apoyá el comercio local — productos únicos de emprendedores CR
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all group-hover:gap-2.5"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
        >
          Ver emprendimientos
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </motion.div>
  )
}

// ── Ofertas HOT — usa la ProductCard compartida con tag roja (una sola tarjeta en todo el sitio)
function OfertasView({ products, loading }) {
  return (
    <motion.div key="ofertas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }} className="min-h-screen"
      style={{ background: 'var(--hc-blue-900)' }}>
      <div className="relative overflow-hidden py-12 px-4"
        style={{ background: 'linear-gradient(135deg, rgba(231,59,51,0.14) 0%, transparent 60%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 16px rgba(231,59,51,0.6))' }}>🔥</span>
            <div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: '#fff' }}>Ofertas HOT</h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Los mejores precios del momento — no dejes pasar ninguno</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--hc-red-500)' }} />
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>{products.length} productos disponibles ahora</span>
          </div>
        </div>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(231,59,51,0.15), transparent 70%)' }} />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          : products.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-6xl mb-4">🔥</p>
              <p className="text-lg font-bold" style={{ color: '#F4F6F9' }}>Las ofertas están cargando</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Volvé pronto para no perder ningún precio</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} hotTag="HOT" />)}
            </div>
          )}
      </div>
    </motion.div>
  )
}

// ── Emprendimientos ───────────────────────────────────────────────────────────
function EmpCard({ p, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
      whileHover={{ y: -4 }} className="relative rounded-2xl overflow-hidden cursor-pointer group hc-card"
      style={{ boxShadow: '0 2px 16px rgba(16,185,129,0.08)' }}
    >
      <Link to={`/productos/${p.id}`}>
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black"
          style={{ background: 'rgba(16,185,129,0.18)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
          🤝 Local
        </div>
        <div className="aspect-square overflow-hidden"
          style={{ background: 'color-mix(in srgb, #10b981 7%, var(--hc-surface))' }}>
          {p.imagenUrl
            ? <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <div className="w-full h-full flex items-center justify-center opacity-30 text-5xl">🌿</div>
          }
        </div>
        <div className="p-4">
          {p.marcaNombre && (
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#10b981' }}>
              {p.marcaNombre}
            </p>
          )}
          <p className="text-sm font-semibold line-clamp-2 mb-3" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
          <p className="text-xl font-black" style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}>
            {formatPrice(p.precio)}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

function EmprendimientosView({ products, convenios, loading }) {
  return (
    <motion.div key="emprendimientos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }} className="min-h-screen"
      style={{ background: 'var(--hc-bg)' }}>
      <div className="relative overflow-hidden py-12 px-4"
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(52,211,153,0.03) 60%, transparent 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>🤝</div>
            <div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: 'var(--hc-text)' }}>Emprendimientos</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Apoyá negocios locales de Costa Rica — cada compra cuenta</p>
            </div>
          </div>
        </div>
      </div>
      {convenios.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--hc-muted)' }}>Aliados HotClick</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {convenios.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                className="shrink-0 flex flex-col items-center gap-2 p-4 rounded-2xl"
                style={{ background: 'var(--hc-surface)', border: '1px solid rgba(16,185,129,0.22)', minWidth: '110px', boxShadow: '0 2px 12px rgba(16,185,129,0.06)' }}>
                {c.logoUrl
                  ? <img src={c.logoUrl} alt={c.nombre} className="w-10 h-10 object-contain rounded-xl" onError={e => e.target.style.display='none'} />
                  : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{(c.nombre ?? '?')[0].toUpperCase()}</div>
                }
                <p className="text-[11px] font-bold text-center leading-tight" style={{ color: 'var(--hc-text)' }}>{c.nombre}</p>
                <div className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                  Activo
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm font-bold mb-4" style={{ color: 'var(--hc-text)' }}>
          {products.length > 0 ? `${products.length} productos de emprendimientos` : 'Explorá el catálogo de negocios locales'}
        </p>
        {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          : products.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-6xl mb-4">🌱</p>
              <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>Próximamente más productos</p>
              <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Los emprendimientos están cargando su inventario</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map((p, i) => <EmpCard key={p.id} p={p} i={i} />)}
            </div>
          )}
      </div>
    </motion.div>
  )
}

// ── Vista por filas de categoría (modo exploración sin filtros) ───────────────
function CategoryRowsView({ products, categories, convenioMarcaNames, onVerMas, onVerEmprendimientos, onQuickView, page }) {
  const emprendimientosProducts = useMemo(
    () => products.filter(p => convenioMarcaNames.has(p.marcaNombre?.toLowerCase())),
    [products, convenioMarcaNames]
  )

  const categoryRows = useMemo(() => {
    const catMap = new Map()
    products.forEach(p => {
      const catId = p.categoriaId ?? '__sin__'
      if (!catMap.has(catId)) catMap.set(catId, [])
      catMap.get(catId).push(p)
    })
    return [...catMap.entries()]
      .filter(([, ps]) => ps.length > 0)
      .map(([catId, ps]) => {
        const catObj = categories.find(c => String(c.id) === String(catId))
        const catName = catObj?.nombreCategoria ?? catObj?.nombre ?? 'Otros productos'
        return { catId, catName, products: ps }
      })
      .sort((a, b) => b.products.length - a.products.length)
  }, [products, categories])

  const rows = useMemo(() => {
    const result = []
    categoryRows.forEach((row, idx) => {
      result.push({ type: 'category', ...row })
      if (idx === 1 && emprendimientosProducts.length > 0) {
        result.push({ type: 'emprendimientos' })
      }
    })
    if (emprendimientosProducts.length > 0 && categoryRows.length <= 1) {
      result.push({ type: 'emprendimientos' })
    }
    return result
  }, [categoryRows, emprendimientosProducts])

  if (rows.length === 0) return null

  return (
    <motion.div key={`cat-rows-p${page}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {rows.map((row, idx) =>
        row.type === 'emprendimientos' ? (
          <EmprendimientosRow
            key="emp-row"
            products={emprendimientosProducts}
            onVerEmprendimientos={onVerEmprendimientos}
          />
        ) : (
          <CategoryRow
            key={row.catId}
            catName={row.catName}
            catId={row.catId}
            products={row.products}
            onVerMas={onVerMas}
            onQuickView={onQuickView}
          />
        )
      )}
    </motion.div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const SORT_OPTIONS = [
    { value: 'default',    label: 'Relevancia' },
    { value: 'featured',   label: 'Destacados' },
    { value: 'price_asc',  label: 'Menor precio' },
    { value: 'price_desc', label: 'Mayor precio' },
    { value: 'name',       label: 'A–Z' },
  ]

  const STOCK_OPTIONS = [
    { value: '',    label: 'Todos' },
    { value: 'ok',  label: 'En stock' },
    { value: 'low', label: 'Bajo stock' },
    { value: 'out', label: 'Agotado' },
  ]

  const COND_OPTIONS = [
    { value: '',          label: 'Todas' },
    { value: 'NUEVO',     label: 'Nuevo' },
    { value: 'COMO_NUEVO', label: 'Como nuevo' },
    { value: 'USADO',     label: 'Usado' },
  ]

  const [products,  setProducts]  = useState([])
  const [categories, setCategories] = useState([])
  const [marcas,    setMarcas]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [page,      setPage]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [viewMode,  setViewMode]  = useState('all')
  const [convenios, setConvenios] = useState([])

  // Filtros
  const [search,      setSearch]      = useState(() => searchParams.get('search') ?? '')
  const [category,    setCategory]    = useState(() => searchParams.get('cat') ?? '')
  const [marcasFilter, setMarcasFilter] = useState(() => {
    const raw = searchParams.get('marcas') ?? searchParams.get('marcaId') ?? ''
    return new Set(raw ? raw.split(',').filter(Boolean) : [])
  })
  const [sort, setSort] = useState(() => localStorage.getItem('hc-products-sort') ?? 'default')
  const [filterStock, setFilterStock] = useState('')
  const [filterCond,  setFilterCond]  = useState('')
  const [filterTalla, setFilterTalla] = useState('')
  const [priceMin,    setPriceMin]    = useState('')
  const [priceMax,    setPriceMax]    = useState('')
  const [quickView,     setQuickView]     = useState(null)
  const [aiPanelOpen,   setAiPanelOpen]   = useState(false)
  const [sidebarOpen,   setSidebarOpen]   = useState(false)
  const aiQuery = searchParams.get('q') || ''

  useEffect(() => {
    if (searchParams.get('ai') === '1') setAiPanelOpen(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [productGridRef, shouldRenderGrid] = useLazyLoad({ threshold: 0.1, rootMargin: '200px' })

  // Sincronizar URL params al cambiar filtros
  useEffect(() => {
    const params = new URLSearchParams()
    if (search)             params.set('search', search)
    if (category)           params.set('cat', category)
    if (marcasFilter.size)  params.set('marcas', [...marcasFilter].join(','))
    const qs = params.toString()
    navigate(`/productos${qs ? `?${qs}` : ''}`, { replace: true })
  }, [search, category, marcasFilter, navigate])

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
    marcaService.getPublicas().then(r => {
      const ms = r.data?.data ?? r.data ?? []
      setMarcas(Array.isArray(ms) ? ms : [])
    }).catch(() => {})
    import('@/services/api').then(({ default: api }) => {
      api.get('/convenios/publicos').then(r => setConvenios(r.data?.data ?? [])).catch(() => {})
    })
  }, [])

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

  // Conjunto de IDs de la categoría seleccionada + todos sus descendientes
  const categoryScope = useMemo(() => {
    if (!category) return null
    const ids = new Set([String(category)])
    const queue = [String(category)]
    while (queue.length > 0) {
      const pid = queue.shift()
      categories
        .filter(c => String(c.padreId ?? '') === pid)
        .forEach(c => { ids.add(String(c.id)); queue.push(String(c.id)) })
    }
    return ids
  }, [category, categories])

  const filtered = useMemo(() => {
    const minPrice = priceMin !== '' ? Number(priceMin) : null
    const maxPrice = priceMax !== '' ? Number(priceMax) : null
    return products
      .filter(p => viewMode !== 'ofertas' || p.enOferta === true)
      .filter(p => viewMode !== 'emprendimientos' || convenioMarcaNames.has(p.marcaNombre?.toLowerCase()))
      .filter(p => !search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.marcaNombre?.toLowerCase().includes(search.toLowerCase()))
      .filter(p => !categoryScope || categoryScope.has(String(p.categoriaId)))
      .filter(p => marcasFilter.size === 0 || marcasFilter.has(String(p.marcaId)))
      .filter(p => {
        if (filterStock === 'ok')  return p.stock > 3
        if (filterStock === 'low') return p.stock > 0 && p.stock <= 3
        if (filterStock === 'out') return p.stock === 0
        return true
      })
      .filter(p => !filterCond  || p.condicion === filterCond)
      .filter(p => !filterTalla || p.talla    === filterTalla)
      .filter(p => (minPrice === null || p.precio >= minPrice) && (maxPrice === null || p.precio <= maxPrice))
      .sort((a, b) => {
        if (sort === 'featured')   return (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0)
        if (sort === 'price_asc')  return a.precio - b.precio
        if (sort === 'price_desc') return b.precio - a.precio
        if (sort === 'name')       return a.nombre?.localeCompare(b.nombre)
        return 0
      })
  }, [products, search, categoryScope, marcasFilter, sort, filterStock, filterCond, priceMin, priceMax, viewMode, convenioMarcaNames, filterTalla])

  const marcaProductCount = useMemo(() =>
    Object.fromEntries(marcas.map(m => [m.id, products.filter(p => String(p.marcaId) === String(m.id)).length]))
  , [marcas, products])

  const tallaOptions = useMemo(() => {
    const all = [...new Set(products.map(p => p.talla).filter(Boolean))]
    const zapatos = all.filter(t => /^\d/.test(t)).sort((a, b) => Number(a) - Number(b))
    const ropa = all.filter(t => !/^\d/.test(t))
    const ORDER = ['XS','S','M','L','XL','XXL','XXXL']
    ropa.sort((a, b) => {
      const ia = ORDER.indexOf(a.toUpperCase()), ib = ORDER.indexOf(b.toUpperCase())
      if (ia >= 0 && ib >= 0) return ia - ib
      return ia >= 0 ? -1 : ib >= 0 ? 1 : a.localeCompare(b)
    })
    return { zapatos, ropa }
  }, [products])

  const hasFilters = !!(category || marcasFilter.size || filterStock || filterCond || filterTalla || priceMin || priceMax || search)
  const clearFilters = useCallback(() => {
    setCategory(''); clearMarcas(); setFilterStock(''); setFilterCond('')
    setFilterTalla(''); setSearch(''); setPriceMin(''); setPriceMax('')
  }, [clearMarcas])

  // Chips activos (excluyendo búsqueda y categoría — esos se ven directamente en los dropdowns)
  const activeChips = [
    ...([...marcasFilter].map(id => ({
      key: `m-${id}`,
      label: marcas.find(m => String(m.id) === id)?.nombreMarca ?? 'Marca',
      clear: () => toggleMarca(id),
    }))),
    filterCond   && { key: 'cond',  label: COND_OPTIONS.find(o => o.value === filterCond)?.label,  clear: () => setFilterCond('') },
    filterStock  && { key: 'stock', label: STOCK_OPTIONS.find(o => o.value === filterStock)?.label, clear: () => setFilterStock('') },
    filterTalla  && { key: 'talla', label: `Talla ${filterTalla}`, clear: () => setFilterTalla('') },
    (priceMin || priceMax) && {
      key: 'price',
      label: priceMin && priceMax
        ? `₡${Number(priceMin).toLocaleString()} – ₡${Number(priceMax).toLocaleString()}`
        : priceMin ? `> ₡${Number(priceMin).toLocaleString()}` : `< ₡${Number(priceMax).toLocaleString()}`,
      clear: () => { setPriceMin(''); setPriceMax('') },
    },
  ].filter(Boolean)

  // Nombre de categoría activa
  const activeCatName = category
    ? (categories.find(c => String(c.id) === String(category))?.nombreCategoria
      ?? categories.find(c => String(c.id) === String(category))?.nombre)
    : null

  // SEO helpers
  const activeMarcaName = marcasFilter.size === 1
    ? marcas.find(m => String(m.id) === [...marcasFilter][0])?.nombreMarca
    : null

  const seoTitle = (() => {
    if (viewMode === 'ofertas') return 'Ofertas HOT — Mejores precios del día | HotClick'
    if (viewMode === 'emprendimientos') return 'Emprendimientos Costarricenses — Negocios locales CR | HotClick'
    if (activeCatName) return `${activeCatName} en Costa Rica — Compra online | HotClick`
    if (activeMarcaName) return `${activeMarcaName} en Costa Rica — Productos originales | HotClick`
    return 'Catálogo de productos — Compra online en Costa Rica | HotClick'
  })()

  const seoDesc = (() => {
    if (viewMode === 'ofertas') return `${filtered.length > 0 ? filtered.length + ' productos con ' : ''}Ofertas y descuentos especiales de emprendedores costarricenses. Precios directos, envío a todo Costa Rica.`
    if (viewMode === 'emprendimientos') return 'Apoyá el comercio local. Descubrí emprendimientos costarricenses y comprá productos únicos con envío a todo el país.'
    if (activeCatName) return `Explorá los mejores productos de ${activeCatName} de emprendedores en Costa Rica. Envío a todo el país, precios directos y pagos seguros.`
    if (activeMarcaName) return `Todos los productos de ${activeMarcaName} disponibles en HotClick Costa Rica. Entrega a domicilio, pagos con SINPE Móvil y tarjeta.`
    return `Explorá más de ${products.length > 0 ? products.length + ' ' : ''}productos únicos de emprendedores costarricenses. Tecnología, ropa, accesorios y más con envío a todo Costa Rica.`
  })()

  const canonicalUrl = 'https://hotclick.lat/productos'
  const shouldNoIndex = hasFilters && (marcasFilter.size > 1 || (marcasFilter.size > 0 && !!category))

  return (
    <>
      <ProductsAssistantPanel
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        initialQuery={aiQuery}
      />

      {/* Botón flotante izquierdo para abrir/cerrar el asistente */}
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
        <span style={{ fontSize: 14 }}>✦</span>
        <span style={{
          writingMode: 'vertical-lr',
          transform: 'rotate(180deg)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}>IA</span>
      </button>

      <MainLayout>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hreflang="es-CR" href={canonicalUrl} />
        <link rel="alternate" hreflang="es"    href={canonicalUrl} />
        <link rel="alternate" hreflang="x-default" href="https://hotclick.lat/" />
        {shouldNoIndex && <meta name="robots" content="noindex, follow" />}
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content="https://hotclick.lat/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDesc} />
        {products.length > 0 && viewMode === 'all' && (
          <script type="application/ld+json">
            {JSON.stringify(generateItemListJsonLd(products.slice(0, 12), 'https://hotclick.lat'))}
          </script>
        )}
      </Helmet>

      {/* ── Tabs de vista ── */}
      <div style={{ borderBottom: '1px solid var(--hc-border)', background: 'var(--hc-surface)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto scrollbar-hide py-3">
          {[
            {
              id: 'emprendimientos', label: 'Emprendimientos', sub: 'Negocios locales CR',
              icon: <span className="text-xl leading-none">🤝</span>,
              accent: '#10b981', accentBg: 'rgba(16,185,129,0.12)',
            },
          ].map(tab => {
            const active = viewMode === tab.id
            return (
              <button key={tab.id}
                onClick={() => { setViewMode(tab.id); clearFilters() }}
                className="relative shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left transition-all duration-200 whitespace-nowrap"
                style={active
                  ? { background: tab.accentBg, border: `1.5px solid color-mix(in srgb, ${tab.accent} 20%, transparent)` }
                  : { background: 'transparent', border: '1.5px solid transparent' }
                }
              >
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{ background: active ? tab.accentBg : 'color-mix(in srgb, var(--hc-text) 6%, transparent)', color: active ? tab.accent : 'var(--hc-muted)' }}>
                  {tab.icon}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-bold leading-tight" style={{ color: active ? tab.accent : 'var(--hc-text)' }}>{tab.label}</span>
                  <span className="text-[11px] leading-tight" style={{ color: 'var(--hc-muted)' }}>{tab.sub}</span>
                </span>
                {active && (
                  <motion.div layoutId="tab-dot"
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ background: tab.accent }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Vistas ── */}
      <AnimatePresence mode="wait">
        {viewMode === 'ofertas' && (
          <OfertasView key="v-ofertas" products={filtered} loading={loading} />
        )}
        {viewMode === 'emprendimientos' && (
          <EmprendimientosView key="v-emp" products={filtered} convenios={convenios} loading={loading} />
        )}
        {viewMode === 'all' && (
          <motion.div key="v-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }} className="min-h-screen" style={{ background: 'var(--hc-bg)' }}>

            {/* Hero */}
            <div className="relative overflow-hidden py-10 px-4"
              style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--hc-accent) 10%, var(--hc-bg)) 0%, color-mix(in srgb, var(--hc-accent) 3%, var(--hc-bg)) 60%, var(--hc-bg) 100%)' }}>
              <div className="max-w-7xl mx-auto">
                {/* Breadcrumb desde categoría (Brand Book §7.4) */}
                {activeCatName && (
                  <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs mb-4">
                    <Link to="/" className="hover:underline" style={{ color: 'var(--hc-muted)' }}>Inicio</Link>
                    <span aria-hidden="true" style={{ color: 'var(--hc-border-strong)' }}>/</span>
                    <button onClick={() => setCategory('all')} className="hover:underline" style={{ color: 'var(--hc-muted)' }}>Productos</button>
                    <span aria-hidden="true" style={{ color: 'var(--hc-border-strong)' }}>/</span>
                    <span className="font-semibold" style={{ color: 'var(--hc-text-2)' }}>{activeCatName}</span>
                  </nav>
                )}
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl"
                    style={{ background: 'color-mix(in srgb, var(--hc-accent) 15%, var(--hc-surface))', border: '1px solid color-mix(in srgb, var(--hc-accent) 28%, transparent)' }}>
                    🛍️
                  </div>
                  <div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: 'var(--hc-text)' }}>
                      {activeCatName ?? 'Catálogo completo'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
                      Encontrá todo lo que buscás — precios directos sin intermediarios
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--hc-accent)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>
                    {filtered.length} producto{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--hc-accent) 15%, transparent), transparent 70%)' }} />
            </div>

            {/* Barra de filtros sticky */}
            <CatalogFilterBar
              search={search} setSearch={setSearch}
              sort={sort} setSort={setSort}
              categories={categories} marcas={marcas} marcaProductCount={marcaProductCount}
              tallaOptions={tallaOptions} category={category} setCategory={setCategory}
              marcasFilter={marcasFilter} toggleMarca={toggleMarca} clearMarcas={clearMarcas}
              filterCond={filterCond} setFilterCond={setFilterCond}
              filterStock={filterStock} setFilterStock={setFilterStock}
              filterTalla={filterTalla} setFilterTalla={setFilterTalla}
              priceMin={priceMin} setPriceMin={setPriceMin}
              priceMax={priceMax} setPriceMax={setPriceMax}
              hasFilters={hasFilters} clearFilters={clearFilters}
              COND_OPTIONS={COND_OPTIONS} STOCK_OPTIONS={STOCK_OPTIONS} SORT_OPTIONS={SORT_OPTIONS}
              filteredCount={filtered.length}
              onOpenSidebar={() => setSidebarOpen(true)}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
              <div className="flex items-start gap-6">
                {/* Sidebar — desktop */}
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
                      marcas={marcas}
                      marcasFilter={marcasFilter}
                      toggleMarca={toggleMarca}
                      clearMarcas={clearMarcas}
                      marcaProductCount={marcaProductCount}
                    />
                  </div>
                </aside>

                {/* Contenido principal */}
                <div className="flex-1 min-w-0 space-y-4">
                  {/* Chips de filtros activos */}
                  {activeChips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {activeChips.map(chip => (
                        <button key={chip.key} onClick={chip.clear}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-80"
                          style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)', borderColor: 'color-mix(in srgb, var(--hc-accent) 25%, transparent)' }}>
                          {chip.label}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      ))}
                      {activeChips.length > 1 && (
                        <button onClick={clearFilters} className="text-xs hover:opacity-70 transition-opacity underline" style={{ color: 'var(--hc-muted)' }}>
                          Limpiar todo
                        </button>
                      )}
                    </div>
                  )}

                  {/* Grid de productos */}
                  <div ref={productGridRef}>
                    {!shouldRenderGrid ? (
                      <div className="h-96 animate-pulse rounded-2xl" style={{ background: 'var(--hc-surface)' }} />
                    ) : loading ? (
                      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
                    ) : filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 text-center gap-5">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-3xl"
                            style={{ background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 16%, transparent)' }} />
                          <svg className="relative w-12 h-12" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" strokeWidth={1.3} viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            <line x1="8" y1="11" x2="14" y2="11" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-base mb-1" style={{ color: 'var(--hc-text)' }}>No se encontraron productos</p>
                          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Intentá con otros filtros o buscá por nombre</p>
                        </div>
                        {hasFilters && (
                          <button onClick={clearFilters}
                            className="px-5 py-2 rounded-xl border text-sm font-medium transition-colors hover:opacity-70"
                            style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}>
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    ) : hasFilters ? (
                      /* ── Modo búsqueda / filtros: grid flat reactivo ── */
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={search + category + sort + filterStock + filterCond + priceMin + priceMax + [...marcasFilter].join()}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {search && (
                            <p className="text-xs mb-3 font-medium" style={{ color: 'var(--hc-muted)' }}>
                              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para <span style={{ color: 'var(--hc-text)' }}>"{search}"</span>
                            </p>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                            {filtered.map((product, i) => (
                              <ProductCard key={product.id} product={product} priority={i < 6} index={i} onQuickView={setQuickView} />
                            ))}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    ) : (
                      /* ── Modo por categorías: filas con 3 productos + ver más ── */
                      <CategoryRowsView
                        products={products}
                        categories={categories}
                        convenioMarcaNames={convenioMarcaNames}
                        onVerMas={(catId) => { setCategory(String(catId)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        onVerEmprendimientos={() => { setViewMode('emprendimientos'); clearFilters() }}
                        onQuickView={setQuickView}
                        page={page}
                      />
                    )}

                    {/* Paginación — solo en modo grid flat (cuando hay filtros activos) */}
                    {totalPages > 1 && hasFilters && (
                      <nav aria-label="Paginación" className="flex items-center justify-center gap-1.5 mt-8 flex-wrap">
                        <button onClick={() => fetchProducts(page - 1)} disabled={page === 0}
                          className="hc-btn hc-btn-outline hc-btn-sm disabled:opacity-30 disabled:cursor-not-allowed">
                          Anterior
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i)
                          .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
                          .reduce((acc, i, idx, arr) => {
                            if (idx > 0 && i - arr[idx - 1] > 1) acc.push('…')
                            acc.push(i)
                            return acc
                          }, [])
                          .map((i, idx) =>
                            i === '…' ? (
                              <span key={`gap-${idx}`} className="px-1 text-sm" style={{ color: 'var(--hc-muted)' }}>…</span>
                            ) : (
                              <button
                                key={i}
                                onClick={() => fetchProducts(i)}
                                aria-label={`Página ${i + 1}`}
                                aria-current={i === page ? 'page' : undefined}
                                className="w-8 h-8 rounded-lg text-sm font-semibold transition-colors"
                                style={i === page
                                  ? { background: 'var(--hc-accent)', color: '#fff' }
                                  : { color: 'var(--hc-text-2)', border: '1px solid var(--hc-border)' }}
                              >
                                {i + 1}
                              </button>
                            )
                          )}
                        <button onClick={() => fetchProducts(page + 1)} disabled={page >= totalPages - 1}
                          className="hc-btn hc-btn-outline hc-btn-sm disabled:opacity-30 disabled:cursor-not-allowed">
                          Siguiente
                        </button>
                      </nav>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar drawer — mobile */}
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
                      className="fixed left-0 top-0 bottom-0 z-50 overflow-y-auto lg:hidden"
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
                          marcas={marcas}
                          marcasFilter={marcasFilter}
                          toggleMarca={toggleMarca}
                          clearMarcas={clearMarcas}
                          marcaProductCount={marcaProductCount}
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

function CartMiniBar() {
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total)
  const navigate = useNavigate()

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        >
          <button
            onClick={() => navigate('/carrito')}
            className="pointer-events-auto flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'var(--hc-accent)',
              boxShadow: '0 8px 32px color-mix(in srgb, var(--hc-accent) 45%, transparent), 0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <div className="relative">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-[9px] font-bold flex items-center justify-center" style={{ color: 'var(--hc-accent)' }}>
                {items.length}
              </span>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white leading-none">Ver carrito</p>
              <p className="text-[10px] text-white/75 mt-0.5">{formatPrice(total())}</p>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
