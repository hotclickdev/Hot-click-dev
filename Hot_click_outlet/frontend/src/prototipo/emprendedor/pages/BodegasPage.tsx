import BodegasListaVista from '@/prototipo/compartido/BodegasListaVista'
import EnlacePrimario from '../ui/EnlacePrimario'
import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useBodegasEmprendedor } from '../hooks/useBodegasEmprendedor'

const RUTA_NUEVA_BODEGA = `${RUTA_EMPRENDEDOR}/opciones/bodegas/nueva`

/**
 * Mis bodegas (Figma 78:128 / 352:9400) — chrome Emp + vista compartida.
 */
export default function BodegasPage() {
  const { bodegas, cargando, error } = useBodegasEmprendedor()

  return (
    <EmprendedorPageFrame
      titulo="Mis Bodegas"
      volverA={`${RUTA_EMPRENDEDOR}/opciones`}
      subtitulo="Dónde guardás tu inventario"
    >
      <BodegasListaVista
        bodegas={bodegas}
        cargando={cargando}
        error={error}
        rutaNueva={RUTA_NUEVA_BODEGA}
        variante="emp"
        ctaNueva={<EnlacePrimario to={RUTA_NUEVA_BODEGA}>+ Nueva bodega</EnlacePrimario>}
      />
    </EmprendedorPageFrame>
  )
}
