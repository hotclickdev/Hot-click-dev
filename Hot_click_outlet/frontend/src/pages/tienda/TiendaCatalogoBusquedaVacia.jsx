/** Búsqueda o filtro sin resultados en la tienda del vendedor. */
export default function TiendaCatalogoBusquedaVacia({ onLimpiar }) {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-[var(--t-text)] font-semibold">No encontramos eso en esta tienda</p>
      <p className="text-sm mt-2 text-[var(--t-muted)]">Probá otra búsqueda o mirá todo el catálogo.</p>
      <button
        type="button"
        onClick={onLimpiar}
        className="inline-flex items-center justify-center mt-6 px-5 min-h-11 rounded-lg text-sm font-semibold border border-[var(--t-border)] text-[var(--t-text)] bg-[var(--t-surface)]"
      >
        Ver todo el catálogo
      </button>
    </div>
  )
}
