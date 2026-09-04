import { Boton } from '@/prototipo/compartido/ui'
import EmprendedorPageFrame, { EmprendedorCard, EmprendedorFilaLista } from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useBodegasEmprendedor } from '../hooks/useBodegasEmprendedor'
import { ListaStagger, ItemListaStagger } from '@/prototipo/compartido/motion/ListaStagger'
import EstadoVacioConversacional from '@/prototipo/compartido/motion/EstadoVacioConversacional'
import ListadoFeedback from '@/prototipo/compartido/ListadoFeedback'

const RUTA_NUEVA_BODEGA = `${RUTA_EMPRENDEDOR}/opciones/bodegas/nueva`

/**
 * Mis bodegas (Figma 78:128 / 352:9400).
 */
export default function BodegasPage() {
  const { bodegas, cargando, error } = useBodegasEmprendedor()
  const botonNueva = <Boton to={RUTA_NUEVA_BODEGA}>+ Nueva bodega</Boton>

  return (
    <EmprendedorPageFrame
      titulo="Mis Bodegas"
      volverA={`${RUTA_EMPRENDEDOR}/opciones`}
      subtitulo="Dónde guardás tu inventario"
    >
      <ListadoFeedback
        cargando={cargando}
        error={error}
        cantidad={bodegas.length}
        skeletonLabel="Cargando bodegas"
        className="space-y-3"
        empty={(
          <EstadoVacioConversacional
            titulo="Todavía no tenés bodegas"
            mensaje="Creá la primera para saber dónde guardás tu inventario."
            accion={botonNueva}
          />
        )}
      >
        <ListaStagger className="flex flex-col gap-4">
          {bodegas.map((bodega) => (
            <ItemListaStagger key={bodega.id}>
              <EmprendedorCard>
                <EmprendedorFilaLista
                  titulo={bodega.nombre}
                  detalle={detalleBodega(bodega.ubicacion, bodega.productos, bodega.principal)}
                />
              </EmprendedorCard>
            </ItemListaStagger>
          ))}
        </ListaStagger>
        {botonNueva}
      </ListadoFeedback>
    </EmprendedorPageFrame>
  )
}

function detalleBodega(ubicacion: string, productos: number, principal: boolean): string {
  const base = `${ubicacion} · ${productos} productos`
  return principal ? `${base} · Principal` : base
}
