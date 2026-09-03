import MetodosCobroPanel from '@/prototipo/compartido/MetodosCobroPanel'
import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'

/**
 * Cuentas para recibir ingresos de ventas (Figma 64:194 / 352:4732).
 */
export default function CobroPage() {
  return (
    <EmprendedorPageFrame
      titulo="Métodos de cobro"
      subtitulo="Cuentas donde te llega el dinero de tus ventas"
      volverA={`${RUTA_EMPRENDEDOR}/opciones`}
    >
      <MetodosCobroPanel agregarTo={`${RUTA_EMPRENDEDOR}/opciones/cobro/nuevo`} />
    </EmprendedorPageFrame>
  )
}
