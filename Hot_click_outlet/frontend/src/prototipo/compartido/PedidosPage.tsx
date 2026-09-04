import PedidosListaVista from './PedidosListaVista'
import { EncabezadoPagina } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'
import { usePedidosEmprendedor } from '@/prototipo/emprendedor/hooks/usePedidosEmprendedor'

/**
 * Listado de pedidos (Figma 305:378 / 352:9679) — chrome Seller + vista compartida.
 */
export default function PedidosPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const { seller, cargando, error } = usePedidosEmprendedor()

  return (
    <PedidosListaVista
      pedidos={seller}
      cargando={cargando}
      error={error}
      hrefPedido={(id) => ruta(`pedidos/${id}`)}
      variante="seller"
      mostrarSucursal={plan.id === 'negocioPlus' ? 'negocioPlus' : 'siExiste'}
      encabezado={(
        <>
          <div className="md:hidden">
            <EncabezadoPagina titulo="Pedidos" subtitulo={plan.pedidosSubtitulo} volverA={ruta()} />
          </div>
          <header className="mb-5 hidden md:block">
            <h1 className="font-display text-[28px] font-bold">Pedidos</h1>
            <p className="mt-1 text-sm text-hc-muted">{plan.pedidosSubtitulo}</p>
          </header>
        </>
      )}
    />
  )
}
