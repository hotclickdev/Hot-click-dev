import { EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { useBodegasEmprendedor } from '@/prototipo/emprendedor/hooks/useBodegasEmprendedor'
import EntradaPagina from './motion/EntradaPagina'
import BodegasListaVista from './BodegasListaVista'

/**
 * Mis bodegas (Figma 78:303) — chrome Seller + vista compartida.
 */
export default function BodegasPage() {
  const ruta = useSellerRuta()
  const { bodegas, cargando, error } = useBodegasEmprendedor()
  const rutaNueva = ruta('bodegas/nueva')

  return (
    <EntradaPagina>
      <main className="px-5 pb-8 pt-[60px]">
        <EncabezadoPagina titulo="Mis Bodegas" subtitulo="Dónde guardás tu inventario" volverA={ruta('opciones')} />
        <BodegasListaVista
          bodegas={bodegas}
          cargando={cargando}
          error={error}
          rutaNueva={rutaNueva}
          variante="seller"
        />
      </main>
    </EntradaPagina>
  )
}
