import { estiloMarcaTienda } from './tiendaTheme'

/** Chrome de carga antes de saber si la tienda pública existe. */
export default function EsqueletoTiendaLayout() {
  return (
    <div className="hc-tenant-theme min-h-screen" style={estiloMarcaTienda(null)}>
      <div className="h-14 bg-[var(--t-secondary)] animate-pulse" />
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...new Array(8)].map((_, i) => (
          <div key={i} className="rounded-xl bg-[var(--t-hover)] animate-pulse aspect-[3/4]" />
        ))}
      </div>
    </div>
  )
}
