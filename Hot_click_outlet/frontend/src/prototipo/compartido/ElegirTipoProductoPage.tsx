import { EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import ElegirTipoProductoMenu from './ElegirTipoProductoMenu'
import { ProgresoPasos } from './FormularioPorPasos'
import EntradaPagina from './motion/EntradaPagina'

/**
 * Primer paso al agregar en PYME / Negocio Plus (wizard).
 */
export default function ElegirTipoProductoPage() {
  const ruta = useSellerRuta()
  return (
    <main className="flex flex-col gap-6 px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Agregar producto" volverA={ruta('productos')} />
      <EntradaPagina className="flex flex-col gap-6">
        <ProgresoPasos indice={0} total={5} titulo="Tipo de producto" />
        <ElegirTipoProductoMenu baseNuevo={ruta('productos/nuevo')} />
      </EntradaPagina>
    </main>
  )
}
