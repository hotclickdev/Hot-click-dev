import MetodosCobroPanel from './MetodosCobroPanel'
import PestanasDinero from './PestanasDinero'
import EntradaPagina from './motion/EntradaPagina'
import { EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'

/**
 * Cuentas para recibir ingresos de ventas (Figma 64:546).
 */
export default function CobroPage() {
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-[60px] md:max-w-[760px] md:px-12 md:py-12 md:pt-12">
      <EntradaPagina>
        <EncabezadoPagina
          titulo="Mi dinero"
          subtitulo="Cuentas donde te llega el dinero y la factura de cada quincena a HotClick"
          volverA={ruta('opciones')}
        />
        <PestanasDinero cobro={<MetodosCobroPanel agregarTo={ruta('cobro/nuevo')} />} />
      </EntradaPagina>
    </main>
  )
}
