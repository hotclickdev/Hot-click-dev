import { EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import ElegirTipoProductoMenu from './ElegirTipoProductoMenu'

/**
 * Primer paso al agregar en PYME / Negocio Plus.
 */
export default function ElegirTipoProductoPage() {
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <ElegirTipoProductoMenu
        baseNuevo={ruta('productos/nuevo')}
        cabecera={<EncabezadoPagina titulo="Agregar producto" volverA={ruta('productos')} />}
      />
    </main>
  )
}
