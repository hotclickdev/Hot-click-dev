import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { buildCategoryTree } from './catalogoHelpers'
import CatIcon from './CatIcon'

// ── Barra de filtros completa ─────────────────────────────────────────────────
export default function CatalogFilterBar({
  search, setSearch,
  categories, categoryTotalCount,
  category, setCategory,
  hasFilters, clearFilters,
  onOpenSidebar,
}) {
  const tree = useMemo(
    () => buildCategoryTree(categories).filter(c => (categoryTotalCount?.[c.id] ?? 0) > 0),
    [categories, categoryTotalCount]
  )

  return (
    <div className="sticky top-0 z-30 backdrop-blur-xl"
      style={{ background: 'color-mix(in srgb, var(--hc-bg) 94%, transparent)', borderBottom: '1px solid var(--hc-border)' }}>

      {/* — Fila 1: búsqueda + filtros — */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-2">
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

          {/* Botones de filtro */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5 sm:pb-0">
            {/* Entrada a la experiencia Descubrí */}
            <Link
              to="/descubri"
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-semibold shrink-0 text-white transition-all hover:opacity-90"
              style={{ background: 'var(--hc-accent)' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              Descubrí
            </Link>

            {/* Mobile: abre sidebar drawer */}
            <button
              onClick={onOpenSidebar}
              className="flex lg:hidden items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-semibold border shrink-0 transition-all hover:opacity-80"
              style={{ color: 'var(--hc-text)', borderColor: 'var(--hc-border)', background: 'var(--hc-surface)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
              </svg>
              Filtrar
            </button>

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

      {/* — Fila 2: pills de categorías con íconos — */}
      {tree.length > 0 && (
        <div
          className="overflow-x-auto scrollbar-hide"
          style={{ borderTop: '1px solid color-mix(in srgb, var(--hc-border) 55%, transparent)' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex gap-1.5 py-2 min-w-max">
              <button
                onClick={() => setCategory('')}
                className="flex items-center gap-1.5 shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold transition-all"
                style={!category
                  ? { background: 'var(--hc-accent)', color: '#fff', boxShadow: '0 2px 8px color-mix(in srgb, var(--hc-accent) 35%, transparent)' }
                  : { background: 'color-mix(in srgb, var(--hc-text) 6%, transparent)', color: 'var(--hc-text)', border: '1.5px solid var(--hc-border)' }
                }
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                <span>Todos</span>
              </button>

              {tree.map(cat => {
                const catName = cat.nombreCategoria ?? cat.nombre
                const isActive = String(category) === String(cat.id)
                const catCount = categoryTotalCount?.[cat.id] ?? 0
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(isActive ? '' : String(cat.id))}
                    className="flex items-center gap-1.5 shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
                    style={isActive
                      ? { background: 'var(--hc-accent)', color: '#fff', boxShadow: '0 2px 8px color-mix(in srgb, var(--hc-accent) 35%, transparent)' }
                      : { background: 'color-mix(in srgb, var(--hc-text) 6%, transparent)', color: 'var(--hc-text)', border: '1.5px solid var(--hc-border)' }
                    }
                  >
                    <CatIcon name={catName} />
                    <span className="max-w-[100px] truncate">{catName}</span>
                    <span className="shrink-0 text-[10px] font-bold opacity-60">{catCount}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
