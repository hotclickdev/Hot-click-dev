import { useSearchParams } from 'react-router-dom'
import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { AgregarMetodoCobroPage as WizardCobro } from '@/prototipo/compartido/AgregarMetodoCobroPage'

const RUTA_COBRO = `${RUTA_EMPRENDEDOR}/opciones/cobro`

/**
 * Wrapper Emprendedor del wizard compartido de método de cobro.
 */
export default function AgregarMetodoCobroPage() {
  const [params] = useSearchParams()
  const editando = Boolean(params.get('editar'))
  return (
    <EmprendedorPageFrame
      titulo={editando ? 'Editar método de cobro' : 'Agregar método de cobro'}
      volverA={RUTA_COBRO}
    >
      <WizardCobro volverA={RUTA_COBRO} rutaExito={RUTA_COBRO} soloFormulario />
    </EmprendedorPageFrame>
  )
}
