import { useLocation } from 'react-router-dom'
import { SUFIJO_VOLVER_ONBOARDING, rutaVolver } from '@/pages/plataforma/tiendaRapida'
import CabeceraAtras from '../ui/CabeceraAtras'
import AvisoFaltaUbicacion from '../ui/AvisoFaltaUbicacion'
import { RUTA_EMPRENDEDOR } from '../constants'
import ElegirTipoProductoMenu from '@/prototipo/compartido/ElegirTipoProductoMenu'
import { ProgresoPasos } from '@/prototipo/compartido/FormularioPorPasos'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'

/**
 * Primer paso al agregar: elegir producto normal o personalizado (wizard).
 */
export default function ElegirTipoProductoPage() {
  const location = useLocation()
  return (
    <main className="flex flex-col gap-6 px-5 py-8">
      <CabeceraAtras titulo="Agregar producto" to={`${RUTA_EMPRENDEDOR}/productos`} />
      <EntradaPagina className="flex flex-col gap-6">
        <AvisoFaltaUbicacion />
        <ProgresoPasos indice={0} total={5} titulo="Tipo de producto" />
        <ElegirTipoProductoMenu
          baseNuevo={`${RUTA_EMPRENDEDOR}/productos/nuevo`}
          sufijo={rutaVolver(location.search) ? SUFIJO_VOLVER_ONBOARDING : ''}
        />
      </EntradaPagina>
    </main>
  )
}
