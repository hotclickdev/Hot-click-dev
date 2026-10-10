import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { NuevaBodegaPage as WizardBodega } from '@/prototipo/compartido/NuevaBodegaPage'
import { useLocation } from 'react-router-dom'
import { rutaVolver } from '@/pages/plataforma/tiendaRapida'

const RUTA_BODEGAS = `${RUTA_EMPRENDEDOR}/opciones/bodegas`

/**
 * Wrapper Emprendedor del wizard compartido de bodega.
 */
export default function NuevaBodegaPage() {
  const volver = rutaVolver(useLocation().search)
  return (
    <EmprendedorPageFrame titulo="Nueva Bodega" volverA={RUTA_BODEGAS}>
      <WizardBodega volverA={RUTA_BODEGAS} rutaExito={volver ?? RUTA_BODEGAS} soloFormulario />
    </EmprendedorPageFrame>
  )
}
