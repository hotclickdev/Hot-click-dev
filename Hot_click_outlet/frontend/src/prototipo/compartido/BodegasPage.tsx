import { Boton, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'

const BODEGAS = [
  { id: 'central', letra: 'B', nombre: 'Bodega Central', detalle: 'San José · 12 productos', principal: true },
  { id: 'casa', letra: 'D', nombre: 'Depósito Casa', detalle: 'Heredia · 4 productos', principal: false },
] as const

/**
 * Mis bodegas (Figma 78:303).
 */
export default function BodegasPage() {
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Mis Bodegas" subtitulo="Dónde guardás tu inventario" volverA={ruta('opciones')} />
      <Boton to={ruta('bodegas/nueva')}>+ Nueva bodega</Boton>
      <ul className="mt-5 space-y-3">
        {BODEGAS.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-xl bg-hc-surface-2 p-3.5">
            <span className="flex size-11 items-center justify-center rounded-full bg-hc-surface text-sm font-bold">{item.letra}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{item.nombre}</p>
              <p className="text-xs text-hc-muted">{item.detalle}</p>
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
