import CabeceraAtras from '../ui/CabeceraAtras'
import { RUTA_EMPRENDEDOR } from '../constants'
import ElegirTipoProductoMenu from '@/prototipo/compartido/ElegirTipoProductoMenu'

/**
 * Primer paso al agregar: elegir producto normal o personalizado.
 */
export default function ElegirTipoProductoPage() {
  return (
    <main className="flex flex-col gap-6 px-5 py-8">
      <ElegirTipoProductoMenu
        baseNuevo={`${RUTA_EMPRENDEDOR}/productos/nuevo`}
        cabecera={<CabeceraAtras titulo="Agregar producto" to={`${RUTA_EMPRENDEDOR}/productos`} />}
      />
    </main>
  )
}
