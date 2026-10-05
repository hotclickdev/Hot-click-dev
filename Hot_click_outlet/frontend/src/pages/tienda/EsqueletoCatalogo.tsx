/** Esqueleto del grid de productos de la tienda pública (tarjetas de 167x280, como la real). */
export default function EsqueletoCatalogo() {
  return (
    <div className="grid grid-cols-[repeat(2,minmax(0,167px))] justify-between gap-y-4 sm:grid-cols-[repeat(auto-fill,167px)] sm:justify-start sm:gap-x-4 sm:gap-y-5">
      {[...new Array(6)].map((_, i) => (
        <div key={i} className="h-[280px] animate-pulse rounded-[14px] bg-hc-n-100" />
      ))}
    </div>
  )
}
