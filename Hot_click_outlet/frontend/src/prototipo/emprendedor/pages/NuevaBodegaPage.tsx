import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { NuevaBodegaPage as WizardBodega } from '@/prototipo/compartido/NuevaBodegaPage'

const RUTA_BODEGAS = `${RUTA_EMPRENDEDOR}/opciones/bodegas`

/**
 * Wrapper Emprendedor del wizard compartido de bodega.
 */
export default function NuevaBodegaPage() {
  return (
    <EmprendedorPageFrame titulo="Nueva Bodega" volverA={RUTA_BODEGAS}>
      <WizardBodega volverA={RUTA_BODEGAS} rutaExito={RUTA_BODEGAS} soloFormulario />
    </EmprendedorPageFrame>
  )
}
