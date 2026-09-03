import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { DatosNegocioPage as WizardNegocio } from '@/prototipo/compartido/DatosNegocioPage'

const RUTA_OPCIONES = `${RUTA_EMPRENDEDOR}/opciones`

/**
 * Wrapper Emprendedor del wizard compartido de datos de negocio.
 */
export default function DatosNegocioPage() {
  return (
    <EmprendedorPageFrame titulo="Datos de tu Negocio" volverA={RUTA_OPCIONES}>
      <WizardNegocio volverA={RUTA_OPCIONES} rutaExito={RUTA_OPCIONES} soloFormulario />
    </EmprendedorPageFrame>
  )
}
