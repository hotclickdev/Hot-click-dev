import { estiloMarcaTienda } from './tiendaTheme'

/** Carga antes de saber si la tienda pública existe: portada, logo y grid (Figma `29:922`, en gris). */
export default function EsqueletoTiendaLayout() {
  return (
    <div className="hc-tenant-theme min-h-screen bg-hc-n-50" style={estiloMarcaTienda(null)} aria-busy="true">
      <div className="h-[120px] animate-pulse bg-hc-n-200 lg:h-[220px]" />
      <div className="mx-auto max-w-[1232px] px-4">
        <div className="-mt-[34px] size-[76px] animate-pulse rounded-[21px] border-[3px] border-hc-n-0 bg-hc-n-200" />
        <div className="mt-3 h-6 w-1/2 animate-pulse rounded-md bg-hc-n-200" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded-md bg-hc-n-100" />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[...new Array(6)].map((_, i) => (
            <div key={i} className="h-[280px] animate-pulse rounded-[14px] bg-hc-n-100" />
          ))}
        </div>
      </div>
    </div>
  )
}
