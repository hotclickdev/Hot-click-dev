import { CatColor, categoryEmoji } from './productSearch/posProductSearchHelpers'
import { ProductGrid } from './productSearch/ProductGrid'
import { usePOSProductSearch } from './productSearch/usePOSProductSearch'

export default function POSProductSearch({ onAdd }) {
  const {
    categorias,
    catSel,
    setCatSel,
    productos,
    setProductos,
    loadingCat,
    loadingProd,
    query,
    searchResults,
    searchLoading,
    inputRef,
    cargarPorCategoria,
    handleChange,
    handleKeyDown,
    handleAdd,
  } = usePOSProductSearch()

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--hc-muted)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={(e) => handleKeyDown(e, onAdd)}
          placeholder="Buscar o escanear barcode… (F2)"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: 'var(--hc-surface)',
            border: `1px solid ${query ? 'rgba(23,71,168,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: 'var(--hc-text)',
          }}
        />
        {(searchLoading || loadingProd) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
        )}
      </div>

      {query ? (
        <div className="flex-1 overflow-y-auto">
          {searchResults.length === 0 && !searchLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Sin resultados para "{query}"</p>
            </div>
          ) : (
            <ProductGrid items={searchResults} onAdd={(p) => handleAdd(p, onAdd)} />
          )}
        </div>
      ) : (
        <>
          {catSel ? (
            <>
              <div className="flex items-center gap-2">
                <button onClick={() => { setCatSel(null); setProductos([]) }}
                  className="p-1.5 rounded-lg hover:bg-white/8 transition-colors"
                  style={{ color: 'var(--hc-muted)' }}>
                  ← Volver
                </button>
                <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                  {catSel.nombreCategoria}
                </span>
                <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  ({productos.length} productos)
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ProductGrid items={productos} onAdd={(p) => handleAdd(p, onAdd)} />
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {loadingCat ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {categorias.map((cat, i) => {
                    const c = CatColor(i)
                    return (
                      <button key={cat.id}
                        onClick={() => cargarPorCategoria(cat)}
                        className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl text-center transition-all hover:scale-[1.03] active:scale-[0.97]"
                        style={{ backgroundColor: c.bg, border: `1.5px solid ${c.border}`, minHeight: 80 }}>
                        <span className="text-2xl">
                          {categoryEmoji(cat.nombreCategoria)}
                        </span>
                        <span className="text-xs font-semibold leading-tight" style={{ color: c.text }}>
                          {cat.nombreCategoria}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
