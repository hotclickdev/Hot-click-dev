import { Boton, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { useBodegasEmprendedor } from '@/prototipo/emprendedor/hooks/useBodegasEmprendedor'
import EntradaPagina from './motion/EntradaPagina'
import { ListaStagger, ItemListaStagger } from './motion/ListaStagger'
import EstadoVacioConversacional from './motion/EstadoVacioConversacional'
import ListadoFeedback from './ListadoFeedback'

/**
 * Mis bodegas (Figma 78:303) — API real.
 */
export default function BodegasPage() {
  const ruta = useSellerRuta()
  const { bodegas, cargando, error } = useBodegasEmprendedor()
  const rutaNueva = ruta('bodegas/nueva')
  const botonNueva = <Boton to={rutaNueva}>+ Nueva bodega</Boton>

  return (
    <EntradaPagina>
      <main className="px-5 pb-8 pt-[60px]">
        <EncabezadoPagina titulo="Mis Bodegas" subtitulo="Dónde guardás tu inventario" volverA={ruta('opciones')} />
        <ListadoFeedback
          cargando={cargando}
          error={error}
          cantidad={bodegas.length}
          skeletonLabel="Cargando bodegas"
          empty={(
            <EstadoVacioConversacional
              titulo="Todavía no tenés bodegas"
              mensaje="Creá la primera para saber dónde guardás tu inventario."
              accion={botonNueva}
            />
          )}
        >
          {botonNueva}
          <ListaStagger className="mt-5 space-y-3">
            {bodegas.map((item) => (
              <ItemListaStagger key={item.id}>
                <div className="flex items-center gap-3 rounded-xl bg-hc-surface-2 p-3.5">
                  <span className="flex size-11 items-center justify-center rounded-full bg-hc-surface text-sm font-bold">
                    {item.nombre.slice(0, 1)}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.nombre}</p>
                    <p className="text-xs text-hc-muted">{item.ubicacion || 'Sin ubicación'}</p>
                  </div>
                  {item.principal ? (
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px]"
                      style={{ background: 'var(--hc-blue-50)', color: 'var(--hc-blue-700)' }}
                    >
                      Principal
                    </span>
                  ) : null}
                </div>
              </ItemListaStagger>
            ))}
          </ListaStagger>
        </ListadoFeedback>
      </main>
    </EntradaPagina>
  )
}
