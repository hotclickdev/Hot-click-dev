import PedidosListaVista from '@/prototipo/compartido/PedidosListaVista'
import CabeceraAtras from '../ui/CabeceraAtras'
import { RUTA_EMPRENDEDOR } from '../constants'
import { usePedidosEmprendedor } from '../hooks/usePedidosEmprendedor'

/**
 * Pedidos (Figma 128:128) — chrome Emp + vista compartida.
 */
export default function PedidosPage() {
  const { seller, cargando, error } = usePedidosEmprendedor()

  return (
    <PedidosListaVista
      pedidos={seller}
      cargando={cargando}
      error={error}
      hrefPedido={(id) => `${RUTA_EMPRENDEDOR}/pedidos/${id}`}
      variante="emp"
      mostrarSucursal="nunca"
      encabezado={(
        <>
          <div className="md:hidden">
            <CabeceraAtras titulo="Pedidos" to={RUTA_EMPRENDEDOR} />
            <p className="text-xs text-hc-muted">Tus ventas y su estado de envío</p>
          </div>
          <header className="hidden md:block">
            <h1 className="font-display text-[28px] font-bold">Pedidos</h1>
            <p className="mt-1 text-sm text-hc-muted">Tus ventas y su estado de envío</p>
          </header>
        </>
      )}
    />
  )
}
