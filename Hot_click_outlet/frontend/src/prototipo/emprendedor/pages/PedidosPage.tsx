import PedidosListaVista from '@/prototipo/compartido/PedidosListaVista'
import MarcoVentas from '@/prototipo/compartido/MarcoVentas'
import { RUTA_EMPRENDEDOR } from '../constants'
import { usePedidosEmprendedor } from '../hooks/usePedidosEmprendedor'

/**
 * Ventas / pedidos — misma cabecera que Encargos.
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
      encabezado={<MarcoVentas lado="pedidos" />}
    />
  )
}
