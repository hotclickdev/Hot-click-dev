import type { RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Spinner from '@/components/ui/Spinner'
import ProductCard from './catalogoProductCard'
import CategoryRowsView from './CategoryRowsView'
import type { Producto } from '@/types/producto'
import type { CatalogCategoria } from './catalogoTipos'

function tokensPaginacion(total: number, actual: number): (number | '…')[] {
  return Array.from({ length: total }, (_, i) => i)
    .filter(i => i === 0 || i === total - 1 || Math.abs(i - actual) <= 1)
    .reduce<(number | '…')[]>((acc, i, idx, arr) => {
      if (idx > 0 && i - arr[idx - 1] > 1) acc.push('…')
      acc.push(i)
      return acc
    }, [])
}

function CatalogGridEmpty({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  return (
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
        <button type="button" onClick={onClearFilters}
          className="px-5 py-2 rounded-xl border text-sm font-medium transition-colors hover:opacity-70"
          style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}>
          Limpiar filtros
        </button>
      )}
    </div>
  )
}

function CatalogGridPagination({
  filteredPages, filterViewPage, onPageChange,
}: {
  filteredPages: number
  filterViewPage: number
  onPageChange: (page: number) => void
}) {
  const irA = (next: number) => {
    onPageChange(next)
    globalThis.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-1.5 mt-8 flex-wrap">
      <button type="button"
        onClick={() => irA(filterViewPage - 1)}
        disabled={filterViewPage === 0}
        className="hc-btn hc-btn-outline hc-btn-sm disabled:opacity-30 disabled:cursor-not-allowed">
        Anterior
      </button>
      {tokensPaginacion(filteredPages, filterViewPage).map((i, idx) =>
        i === '…' ? (
          <span key={`gap-${idx}`} className="px-1 text-sm" style={{ color: 'var(--hc-muted)' }}>…</span>
        ) : (
          <button type="button"
            key={i}
            onClick={() => irA(i)}
            aria-label={`Página ${i + 1}`}
            aria-current={i === filterViewPage ? 'page' : undefined}
            className="w-8 h-8 rounded-lg text-sm font-semibold transition-colors"
            style={i === filterViewPage
              ? { background: 'var(--hc-accent)', color: '#fff' }
              : { color: 'var(--hc-text-2)', border: '1px solid var(--hc-border)' }}
          >
            {i + 1}
          </button>
        )
      )}
      <button type="button"
        onClick={() => irA(filterViewPage + 1)}
        disabled={filterViewPage >= filteredPages - 1}
        className="hc-btn hc-btn-outline hc-btn-sm disabled:opacity-30 disabled:cursor-not-allowed">
        Siguiente
      </button>
    </nav>
  )
}

function CatalogFlatGrid({
  animKey, search, filtered, filteredSlice, onQuickView,
}: {
  animKey: string
  search: string
  filtered: Producto[]
  filteredSlice: Producto[]
  onQuickView: (product: Producto) => void
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animKey}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {search && (
          <p className="text-xs mb-3 font-medium" style={{ color: 'var(--hc-muted)' }}>
            {filtered.length} resultado{filtered.length === 1 ? '' : 's'} para <span style={{ color: 'var(--hc-text)' }}>"{search}"</span>
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredSlice.map((product, i) => (
            <ProductCard key={product.id} product={product} priority={i < 6} index={i} onQuickView={onQuickView} />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function cuerpoCatalogo({
  shouldRender, loading, filtered, hasFilters, onClearFilters, flatGrid,
  animKey, search, filteredSlice, onQuickView,
  products, categories, convenioMarcaNames, onVerMas, onVerEmprendimientos, page,
}: {
  shouldRender: boolean
  loading: boolean
  filtered: Producto[]
  hasFilters: boolean
  onClearFilters: () => void
  flatGrid: boolean
  animKey: string
  search: string
  filteredSlice: Producto[]
  onQuickView: (product: Producto) => void
  products: Producto[]
  categories: CatalogCategoria[]
  convenioMarcaNames: Set<string>
  onVerMas: (catId: unknown) => void
  onVerEmprendimientos: () => void
  page: number
}) {
  if (!shouldRender) {
    return <div className="h-96 animate-pulse rounded-2xl" style={{ background: 'var(--hc-surface)' }} />
  }
  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (filtered.length === 0) return <CatalogGridEmpty hasFilters={hasFilters} onClearFilters={onClearFilters} />
  if (flatGrid) {
    return (
      <CatalogFlatGrid
        animKey={animKey} search={search}
        filtered={filtered} filteredSlice={filteredSlice} onQuickView={onQuickView}
      />
    )
  }
  return (
    <CategoryRowsView
      products={products}
      categories={categories}
      convenioMarcaNames={convenioMarcaNames}
      onVerMas={onVerMas}
      onVerEmprendimientos={onVerEmprendimientos}
      onQuickView={onQuickView}
      page={page}
    />
  )
}

export default function CatalogProductGrid({
  gridRef, shouldRender, loading,
  filtered, filteredSlice, filteredPages, filterViewPage, onPageChange,
  hasFilters, onClearFilters, flatGrid, animKey, search,
  products, categories, convenioMarcaNames,
  onVerMas, onVerEmprendimientos, onQuickView, page,
}: {
  gridRef: RefObject<Element | null>
  shouldRender: boolean
  loading: boolean
  filtered: Producto[]
  filteredSlice: Producto[]
  filteredPages: number
  filterViewPage: number
  onPageChange: (page: number) => void
  hasFilters: boolean
  onClearFilters: () => void
  flatGrid: boolean
  animKey: string
  search: string
  products: Producto[]
  categories: CatalogCategoria[]
  convenioMarcaNames: Set<string>
  onVerMas: (catId: unknown) => void
  onVerEmprendimientos: () => void
  onQuickView: (product: Producto) => void
  page: number
}) {
  return (
    <div ref={gridRef as RefObject<HTMLDivElement>}>
      {cuerpoCatalogo({
        shouldRender, loading, filtered, hasFilters, onClearFilters, flatGrid,
        animKey, search, filteredSlice, onQuickView,
        products, categories, convenioMarcaNames, onVerMas, onVerEmprendimientos, page,
      })}
      {filteredPages > 1 && flatGrid && (
        <CatalogGridPagination
          filteredPages={filteredPages}
          filterViewPage={filterViewPage}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}
