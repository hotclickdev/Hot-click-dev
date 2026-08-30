import { STOCK_OPTIONS } from './productosHelpers'
import type { CategoriaAdmin } from './productosHelpers'
import CloseIcon from '@/components/ui/CloseIcon'
import { etiquetaOpcionPadre } from '@/pages/admin/categorias/formCategoria'
import type { CSSProperties, Dispatch, SetStateAction } from 'react'

const OPCIONES_CONDICION: [string, string][] = [
  ['NUEVO', 'Nuevo'],
  ['COMO_NUEVO', 'Como nuevo'],
  ['USADO', 'Usado'],
]

export type ProductosFiltrosValores = {
  search: string
  onSearch: (valor: string) => void
  filterCat: string
  onFilterCat: Dispatch<SetStateAction<string>>
  filterCond: string
  onFilterCond: Dispatch<SetStateAction<string>>
  filterStock: string
  onFilterStock: Dispatch<SetStateAction<string>>
  categories: CategoriaAdmin[]
  hasFilters: boolean
  onClear: () => void
}

export type ProductosFiltersProps = ProductosFiltrosValores & {
  variante: 'mobile' | 'aside'
}

function SearchIcon() {
  return (
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function estiloChipActivo(activo: boolean): CSSProperties {
  if (activo) {
    return { backgroundColor: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.3)' }
  }
  return { color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }
}

function estiloBotonFiltro(activo: boolean): CSSProperties {
  if (activo) {
    return { backgroundColor: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.25)' }
  }
  return { color: 'var(--hc-muted)' }
}

function FiltrosMovil({
  search, onSearch, filterCat, onFilterCat, filterCond, onFilterCond,
  categories, hasFilters, onClear,
}: Omit<ProductosFiltrosValores, 'filterStock' | 'onFilterStock'>) {
  return (
    <div className="md:hidden space-y-2">
      <div className="relative">
        <SearchIcon />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl text-sm focus:outline-none"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {hasFilters && (
          <button type="button" onClick={onClear} className="shrink-0 px-3 py-1.5 rounded-full text-xs inline-flex items-center gap-1" style={{ border: '1px solid rgba(220,38,38,0.3)', color: '#a8291f' }}>
            <CloseIcon className="w-3 h-3" /> Limpiar
          </button>
        )}
        <select
          value={filterCat}
          onChange={(e) => onFilterCat(e.target.value)}
          className="shrink-0 h-8 px-2.5 rounded-full text-xs focus:outline-none"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
        >
          <option value="">Categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {etiquetaOpcionPadre(c, categories)}
            </option>
          ))}
        </select>
        {[['', 'Condición'] as [string, string], ...OPCIONES_CONDICION].map(([val, lbl]) => (
          <button type="button" key={val} onClick={() => onFilterCond(val)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs transition-all"
            style={estiloChipActivo(filterCond === val)}>{lbl}</button>
        ))}
      </div>
    </div>
  )
}

function FiltrosAside({
  filterCat, onFilterCat, filterCond, onFilterCond, filterStock, onFilterStock,
  categories, hasFilters, onClear,
}: Omit<ProductosFiltrosValores, 'search' | 'onSearch'>) {
  return (
    <aside className="w-52 shrink-0 space-y-5 hidden md:block">
      <div className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Filtros</span>
          {hasFilters && (
            <button type="button" onClick={onClear} className="text-[10px] hover:underline" style={{ color: 'var(--hc-accent)' }}>Limpiar</button>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Categoría</label>
          <select
            value={filterCat}
            onChange={(e) => onFilterCat(e.target.value)}
            className="w-full h-9 px-2.5 rounded-xl text-xs focus:outline-none"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nombreCategoria ?? c.nombre}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Condición</label>
          <div className="space-y-1">
            {[['', 'Todas'] as [string, string], ...OPCIONES_CONDICION].map(([val, lbl]) => (
              <button type="button"
                key={val}
                onClick={() => onFilterCond(val)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all hover:bg-[var(--hc-surface-2)]"
                style={estiloBotonFiltro(filterCond === val)}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Stock</label>
          <div className="space-y-1">
            {STOCK_OPTIONS.map(({ label: lbl, value: val }) => (
              <button type="button"
                key={val}
                onClick={() => onFilterStock(val)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all hover:bg-[var(--hc-surface-2)]"
                style={estiloBotonFiltro(filterStock === val)}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

export default function ProductosFilters({
  variante,
  search,
  onSearch,
  filterCat,
  onFilterCat,
  filterCond,
  onFilterCond,
  filterStock,
  onFilterStock,
  categories,
  hasFilters,
  onClear,
}: ProductosFiltersProps) {
  if (variante === 'mobile') {
    return (
      <FiltrosMovil
        search={search}
        onSearch={onSearch}
        filterCat={filterCat}
        onFilterCat={onFilterCat}
        filterCond={filterCond}
        onFilterCond={onFilterCond}
        categories={categories}
        hasFilters={hasFilters}
        onClear={onClear}
      />
    )
  }
  return (
    <FiltrosAside
      filterCat={filterCat}
      onFilterCat={onFilterCat}
      filterCond={filterCond}
      onFilterCond={onFilterCond}
      filterStock={filterStock}
      onFilterStock={onFilterStock}
      categories={categories}
      hasFilters={hasFilters}
      onClear={onClear}
    />
  )
}
