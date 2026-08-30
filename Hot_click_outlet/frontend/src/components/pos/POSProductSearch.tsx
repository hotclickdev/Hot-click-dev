import { AdminFilterChip } from '@/prototipo/admin/AdminUi'
import { ProductGrid } from './productSearch/ProductGrid'
import { usePOSProductSearch } from './productSearch/usePOSProductSearch'
import type { ProductoPos } from './productSearch/posProductSearchHelpers'

export default function POSProductSearch({
  onAdd,
  cantidades = {},
}: {
  onAdd: (p: ProductoPos) => void
  cantidades?: Record<string, number>
}) {
  const {
    categorias,
    catSel,
    productos,
    loadingCat,
    loadingProd,
    query,
    searchResults,
    searchLoading,
    inputRef,
    cargarPorCategoria,
    cargarTodos,
    handleChange,
    handleKeyDown,
    handleAdd,
  } = usePOSProductSearch()

  const items = query ? searchResults : productos
  const vacioBusqueda = Boolean(query) && searchResults.length === 0 && !searchLoading

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          data-pos-search
          data-mm="pos-buscar"
          value={query}
          onChange={handleChange}
          onKeyDown={(e) => handleKeyDown(e, onAdd)}
          placeholder="Buscar producto o escanear código"
          className="w-full rounded-xl border px-3.5 py-3 text-[13px] text-hc-text outline-none placeholder:text-hc-muted"
          style={{
            borderColor: 'var(--hc-border, #E5E7EC)',
            backgroundColor: 'rgba(248, 249, 251, 0.65)',
          }}
        />
        {(searchLoading || loadingProd) && (
          <div
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--hc-primary)', borderTopColor: 'transparent' }}
          />
        )}
      </div>

      {!query && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
          <AdminFilterChip activo={!catSel} onClick={() => cargarTodos(categorias)}>
            Todos
          </AdminFilterChip>
          {categorias.map((cat) => (
            <AdminFilterChip
              key={String(cat.id)}
              activo={catSel?.id === cat.id}
              onClick={() => cargarPorCategoria(cat)}
            >
              {cat.nombreCategoria ?? 'Categoría'}
            </AdminFilterChip>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {vacioBusqueda ? (
          <p className="py-10 text-center text-sm text-hc-muted">Sin resultados para “{query}”</p>
        ) : loadingCat ? (
          <div className="flex justify-center py-8">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2"
              style={{ borderColor: 'var(--hc-primary)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : categorias.length === 0 && !query ? (
          <p className="py-10 text-center text-sm text-hc-muted">
            Este negocio aún no tiene productos para vender en caja
          </p>
        ) : (
          <ProductGrid items={items} cantidades={cantidades} onAdd={(p) => handleAdd(p, onAdd)} />
        )}
      </div>
    </div>
  )
}
