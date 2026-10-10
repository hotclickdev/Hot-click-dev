import { useNavigate } from 'react-router-dom'
import { EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import CabeceraWizardProducto from './CabeceraWizardProducto'
import ElegirTipoProductoMenu from './ElegirTipoProductoMenu'
import EntradaPagina from './motion/EntradaPagina'

/**
 * Tipo de producto (catálogo / personalizado) a pantalla completa.
 */
export default function ElegirTipoProductoPage() {
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  return (
    <main className="flex flex-col gap-6 px-5 pb-8 pt-0 md:pt-8">
      <CabeceraWizardProducto titulo="Nuevo producto" onCerrar={() => navigate(ruta('productos'))} />
      <div className="max-md:hidden">
        <EncabezadoPagina titulo="Agregar producto" volverA={ruta('productos')} />
      </div>
      <EntradaPagina className="flex flex-col gap-6">
        <h2 className="font-display text-lg font-bold text-hc-text">¿Qué vas a vender?</h2>
        <ElegirTipoProductoMenu baseNuevo={ruta('productos/nuevo')} />
      </EntradaPagina>
    </main>
  )
}
