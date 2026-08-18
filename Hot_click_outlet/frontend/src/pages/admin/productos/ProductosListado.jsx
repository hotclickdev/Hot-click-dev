import Spinner from '@/components/ui/Spinner'
import ProductosFilters from './ProductosFilters'
import ProductosTable from './ProductosTable'
import { PROD_PAGE_SIZE } from './productosHelpers'

/**
 * Filtros, buscador y tabla de productos admin.
 * @param {{
 *   propsFiltros: object
 *   debouncedSearch: string
 *   totalProds: number
 *   search: string
 *   onSearch: (valor: string) => void
 *   loading: boolean
 *   filtered: object[]
 *   products: object[]
 *   prodPage: number
 *   isAdmin: boolean
 *   carruselSlots: object[]
 *   hasFilters: boolean
 *   onToggleDestacado: (p: object) => void
 *   onToggleCarrusel: (p: object) => void
 *   onEdit: (p: object) => void
 *   onKardex: (p: object) => void
 *   onDelete: (id: number, nombre: string) => void
 *   onClearFilters: () => void
 *   onNuevo: () => void
 *   onPage: (page: number) => void
 * }} props
 */
export default function ProductosListado({
  propsFiltros,
  debouncedSearch,
  totalProds,
  search,
  onSearch,
  loading,
  filtered,
  products,
  prodPage,
  isAdmin,
  carruselSlots,
  hasFilters,
  onToggleDestacado,
  onToggleCarrusel,
  onEdit,
  onKardex,
  onDelete,
  onOferta,
  onOcultar,
  onClearFilters,
  onNuevo,
  onPage,
  vistaSimple,
}) {
  return (
    <>
      <ProductosFilters variante="mobile" {...propsFiltros} />

      {debouncedSearch && totalProds > PROD_PAGE_SIZE && (
        <AvisoBusquedaPaginada />
      )}

      <div className="flex gap-5">
        <ProductosFilters variante="aside" {...propsFiltros} />

        <div className="flex-1 min-w-0 space-y-4">
          <BuscadorDesktop search={search} onSearch={onSearch} />

          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : (
            <ProductosTable
              filtered={filtered}
              products={products}
              totalProds={totalProds}
              prodPage={prodPage}
              isAdmin={isAdmin}
              carruselSlots={carruselSlots}
              search={search}
              hasFilters={hasFilters}
              onToggleDestacado={onToggleDestacado}
              onToggleCarrusel={onToggleCarrusel}
              onEdit={onEdit}
              onKardex={onKardex}
              onDelete={onDelete}
              onOferta={onOferta}
              onOcultar={onOcultar}
              onClearFilters={onClearFilters}
              onNuevo={onNuevo}
              onPage={onPage}
              vistaSimple={vistaSimple}
            />
          )}
        </div>
      </div>
    </>
  )
}

function AvisoBusquedaPaginada() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
      style={{ backgroundColor: 'rgba(23,71,168,0.06)', border: '1px solid rgba(23,71,168,0.18)', color: '#7fa0ff' }}>
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Buscando en los {PROD_PAGE_SIZE} productos de la página actual. Para buscar en todo el catálogo, limpiá el texto y navegá por páginas.
    </div>
  )
}

function BuscadorDesktop({ search, onSearch }) {
  return (
    <div className="relative hidden md:block">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        type="text"
        placeholder="Buscar por nombre..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="w-full h-10 pl-10 pr-4 rounded-xl text-sm focus:outline-none transition-colors"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
      />
    </div>
  )
}
