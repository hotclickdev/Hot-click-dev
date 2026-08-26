/** Esqueleto del grid de productos de la tienda pública. */
export default function EsqueletoCatalogo() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...new Array(8)].map((_, i) => (
        <div key={i} className="rounded-xl bg-[var(--t-hover)] animate-pulse aspect-[3/4]" />
      ))}
    </div>
  )
}
