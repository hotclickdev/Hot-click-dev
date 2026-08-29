import { Boton, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { useBodegasEmprendedor } from '@/prototipo/emprendedor/hooks/useBodegasEmprendedor'

/**
 * Mis bodegas (Figma 78:303) — API real.
 */
export default function BodegasPage() {
  const ruta = useSellerRuta()
  const { bodegas, cargando, error } = useBodegasEmprendedor()
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Mis Bodegas" subtitulo="Dónde guardás tu inventario" volverA={ruta('opciones')} />
      <Boton to={ruta('bodegas/nueva')}>+ Nueva bodega</Boton>
      {cargando ? <p className="mt-4 text-sm text-hc-muted">Cargando bodegas…</p> : null}
      {error ? <p className="mt-4 text-sm text-hc-danger">{error}</p> : null}
      {!cargando && bodegas.length === 0 ? (
        <p className="mt-6 text-sm text-hc-muted">Todavía no tenés bodegas.</p>
      ) : null}
      <ul className="mt-5 space-y-3">
        {bodegas.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-xl bg-hc-surface-2 p-3.5">
            <span className="flex size-11 items-center justify-center rounded-full bg-hc-surface text-sm font-bold">
              {item.nombre.slice(0, 1)}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">{item.nombre}</p>
              <p className="text-xs text-hc-muted">{item.ubicacion || 'Sin ubicación'}</p>
            </div>
            {item.principal ? (
              <span className="rounded-full px-2.5 py-1 text-[10px]" style={{ background: 'var(--hc-blue-50)', color: 'var(--hc-blue-700)' }}>
                Principal
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  )
}
