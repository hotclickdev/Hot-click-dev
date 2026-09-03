import MetodosCobroPanel from './MetodosCobroPanel'
import { EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'

/**
 * Cuentas para recibir ingresos de ventas (Figma 64:546).
 */
export default function CobroPage() {
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-[60px] md:max-w-[760px] md:px-12 md:py-12 md:pt-12">
      <EncabezadoPagina
        titulo="Métodos de cobro"
        subtitulo="Cuentas donde te llega el dinero de tus ventas"
        volverA={ruta('opciones')}
      />
      <MetodosCobroPanel agregarTo={ruta('cobro/nuevo')} />
    </main>
  )
}
