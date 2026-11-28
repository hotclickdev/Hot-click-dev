import MetodosCobroPanel from '@/prototipo/compartido/MetodosCobroPanel'
import PestanasDinero from '@/prototipo/compartido/PestanasDinero'
import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'

/**
 * Cuentas para recibir ingresos de ventas (Figma 64:194 / 352:4732).
 */
export default function CobroPage() {
  return (
    <EmprendedorPageFrame
      titulo="Mi dinero"
      subtitulo="Cuentas donde te llega el dinero y la factura de cada quincena a HotClick"
      volverA={`${RUTA_EMPRENDEDOR}/opciones`}
    >
      <PestanasDinero cobro={<MetodosCobroPanel agregarTo={`${RUTA_EMPRENDEDOR}/opciones/cobro/nuevo`} />} />
    </EmprendedorPageFrame>
  )
}
