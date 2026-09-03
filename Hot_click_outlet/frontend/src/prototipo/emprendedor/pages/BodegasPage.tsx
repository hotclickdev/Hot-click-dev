import EnlacePrimario from '../ui/EnlacePrimario'
import EmprendedorPageFrame, { EmprendedorCard, EmprendedorFilaLista } from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useBodegasEmprendedor } from '../hooks/useBodegasEmprendedor'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import { ListaStagger, ItemListaStagger } from '@/prototipo/compartido/motion/ListaStagger'
import EstadoVacioConversacional from '@/prototipo/compartido/motion/EstadoVacioConversacional'

const RUTA_NUEVA_BODEGA = '/opciones/bodegas/nueva'

/**
 * Mis bodegas (Figma 78:128 / 352:9400).
 */
export default function BodegasPage() {
  const { bodegas, cargando, error } = useBodegasEmprendedor()
  const vacio = !cargando && bodegas.length === 0

  return (
    <EmprendedorPageFrame
      titulo="Mis Bodegas"
      volverA={`${RUTA_EMPRENDEDOR}/opciones`}
      subtitulo="Dónde guardás tu inventario"
    >
      <EntradaPagina className="flex flex-col gap-4">
        {cargando ? <p className="text-sm text-hc-muted">Cargando bodegas…</p> : null}
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
        {vacio ? (
          <EstadoVacioConversacional
            titulo="Todavía no tenés bodegas"
            mensaje="Creá la primera para saber dónde guardás tu inventario."
            accion={<EnlacePrimario to={RUTA_NUEVA_BODEGA}>+ Nueva bodega</EnlacePrimario>}
          />
        ) : null}
        {bodegas.length > 0 ? (
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
        ) : null}
        {!vacio ? <EnlacePrimario to={RUTA_NUEVA_BODEGA}>+ Nueva bodega</EnlacePrimario> : null}
      </EntradaPagina>
    </EmprendedorPageFrame>
  )
}

function detalleBodega(ubicacion: string, productos: number, principal: boolean): string {
  const base = `${ubicacion} · ${productos} productos`
  return principal ? `${base} · Principal` : base
}
