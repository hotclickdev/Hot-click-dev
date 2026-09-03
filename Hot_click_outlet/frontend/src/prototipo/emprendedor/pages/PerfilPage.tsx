import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { PerfilPage as WizardPerfil } from '@/prototipo/compartido/PerfilPage'

const RUTA_OPCIONES = `${RUTA_EMPRENDEDOR}/opciones`

/**
 * Wrapper Emprendedor del wizard compartido de perfil.
 */
export default function PerfilPage() {
  return (
    <EmprendedorPageFrame titulo="Editar Perfil" volverA={RUTA_OPCIONES}>
      <WizardPerfil volverA={RUTA_OPCIONES} rutaExito={RUTA_OPCIONES} soloFormulario />
    </EmprendedorPageFrame>
  )
}
