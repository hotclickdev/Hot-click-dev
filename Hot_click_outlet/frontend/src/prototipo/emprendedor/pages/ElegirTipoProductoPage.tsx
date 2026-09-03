import CabeceraAtras from '../ui/CabeceraAtras'
import { RUTA_EMPRENDEDOR } from '../constants'
import ElegirTipoProductoMenu from '@/prototipo/compartido/ElegirTipoProductoMenu'
import { ProgresoPasos } from '@/prototipo/compartido/FormularioPorPasos'

/**
 * Primer paso al agregar: elegir producto normal o personalizado (wizard).
 */
export default function ElegirTipoProductoPage() {
  return (
    <main className="flex flex-col gap-6 px-5 py-8">
      <CabeceraAtras titulo="Agregar producto" to={`${RUTA_EMPRENDEDOR}/productos`} />
      <ProgresoPasos indice={0} total={5} titulo="Tipo de producto" />
      <ElegirTipoProductoMenu baseNuevo={`${RUTA_EMPRENDEDOR}/productos/nuevo`} />
    </main>
  )
}
