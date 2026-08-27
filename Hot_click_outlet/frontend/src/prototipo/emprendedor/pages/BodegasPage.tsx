import { useNavigate } from 'react-router-dom'
import BadgeEstado from '../ui/BadgeEstado'
import CabeceraAtras from '../ui/CabeceraAtras'
import EnlacePrimario from '../ui/EnlacePrimario'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useBodegasEmprendedor } from '../hooks/useBodegasEmprendedor'

/**
 * Mis bodegas (Figma 78:128).
 */
export default function BodegasPage() {
  const navigate = useNavigate()
  const { bodegas } = useBodegasEmprendedor()
  return (
    <main className="flex flex-col gap-[18px] px-5 pb-10 pt-8">
      <div>
        <CabeceraAtras titulo="Mis Bodegas" to={`${RUTA_EMPRENDEDOR}/opciones`} />
        <p className="text-xs text-hc-muted">Dónde guardás tu inventario</p>
      </div>
      <EnlacePrimario to="/opciones/bodegas/nueva">+ Nueva bodega</EnlacePrimario>
      {bodegas.map((bodega) => (
        <button
          key={bodega.id}
          type="button"
          onClick={() => navigate(`${RUTA_EMPRENDEDOR}/proximamente`)}
          className="flex w-full items-center gap-3 rounded-[14px] border border-hc-border p-3.5 text-left"
        >
          <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--hc-n-100)] text-[15px] font-bold text-hc-muted">
            {bodega.nombre.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">{bodega.nombre}</p>
            <p className="text-[11px] text-hc-muted">
              {bodega.ubicacion} · {bodega.productos} productos
            </p>
          </div>
          {bodega.principal ? <BadgeEstado tono="exito">Principal</BadgeEstado> : null}
        </button>
      ))}
    </main>
  )
}
