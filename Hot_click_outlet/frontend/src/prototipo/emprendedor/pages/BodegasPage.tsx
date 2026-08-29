import EnlacePrimario from '../ui/EnlacePrimario'
import EmprendedorPageFrame, { EmprendedorCard, EmprendedorFilaLista } from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useBodegasEmprendedor } from '../hooks/useBodegasEmprendedor'

/**
 * Mis bodegas (Figma 78:128 / 352:9400).
 */
export default function BodegasPage() {
  const { bodegas, cargando, error } = useBodegasEmprendedor()

  return (
    <EmprendedorPageFrame
      titulo="Mis Bodegas"
      volverA={`${RUTA_EMPRENDEDOR}/opciones`}
      subtitulo="Dónde guardás tu inventario"
    >
      {cargando ? <p className="text-sm text-hc-muted">Cargando bodegas…</p> : null}
      {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
      {!cargando && bodegas.length === 0 ? (
        <p className="text-sm text-hc-muted">Todavía no tenés bodegas.</p>
      ) : null}
      <div className="flex flex-col gap-4">
        {bodegas.map((bodega) => (
          <EmprendedorCard key={bodega.id}>
            <EmprendedorFilaLista
              titulo={bodega.nombre}
              detalle={detalleBodega(bodega.ubicacion, bodega.productos, bodega.principal)}
            />
          </EmprendedorCard>
        ))}
      </div>
      <EnlacePrimario to="/opciones/bodegas/nueva">+ Nueva bodega</EnlacePrimario>
    </EmprendedorPageFrame>
  )
}

function detalleBodega(ubicacion: string, productos: number, principal: boolean): string {
  const base = `${ubicacion} · ${productos} productos`
  return principal ? `${base} · Principal` : base
}
