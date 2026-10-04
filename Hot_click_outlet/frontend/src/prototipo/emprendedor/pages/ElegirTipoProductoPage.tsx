import { useNavigate } from 'react-router-dom'
import CabeceraAtras from '../ui/CabeceraAtras'
import { RUTA_EMPRENDEDOR } from '../constants'
import CabeceraWizardProducto from '@/prototipo/compartido/CabeceraWizardProducto'
import ElegirTipoProductoMenu from '@/prototipo/compartido/ElegirTipoProductoMenu'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'

/**
 * Tipo de producto a pantalla completa (sin barra del panel).
 */
export default function ElegirTipoProductoPage() {
  const navigate = useNavigate()
  return (
    <main className="flex flex-col gap-6 px-5 pb-8 pt-0 md:pt-8">
      <CabeceraWizardProducto
        titulo="Nuevo producto"
        onCerrar={() => navigate(`${RUTA_EMPRENDEDOR}/productos`)}
      />
      <div className="max-md:hidden">
        <CabeceraAtras titulo="Agregar producto" to={`${RUTA_EMPRENDEDOR}/productos`} />
      </div>
      <EntradaPagina className="flex flex-col gap-6">
        <h2 className="font-display text-lg font-bold text-hc-text">¿Qué vas a vender?</h2>
        <ElegirTipoProductoMenu baseNuevo={`${RUTA_EMPRENDEDOR}/productos/nuevo`} />
      </EntradaPagina>
    </main>
  )
}
