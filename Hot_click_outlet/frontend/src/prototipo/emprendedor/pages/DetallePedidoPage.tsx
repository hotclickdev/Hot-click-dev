import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import BadgeEstado from '../ui/BadgeEstado'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import Miniatura from '../ui/Miniatura'
import { RUTA_EMPRENDEDOR } from '../constants'
import { PEDIDOS_DEMO } from '../data/pedidosDemo'
import { usePedidosEmprendedor } from '../hooks/usePedidosEmprendedor'
import { useEmprendedorDemoStore } from '../store/emprendedorDemoStore'

/**
 * Detalle de pedido (Figma 128:157).
 */
export default function DetallePedidoPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { pedidos } = usePedidosEmprendedor()
  const marcarPedidoEnviado = useEmprendedorDemoStore((estado) => estado.marcarPedidoEnviado)
  const pedido = useMemo(
    () => pedidos.find((p) => p.id === id) ?? PEDIDOS_DEMO.find((p) => p.id === id),
    [pedidos, id],
  )

  if (!pedido) {
    return (
      <main className="px-5 py-8">
        <CabeceraAtras titulo="Pedido" to={`${RUTA_EMPRENDEDOR}/pedidos`} />
        <p className="mt-4 text-sm text-hc-muted">No encontramos ese pedido.</p>
      </main>
    )
  }

  const pedidoId = pedido.id

  function marcarEnviado() {
    marcarPedidoEnviado(pedidoId)
    navigate(`${RUTA_EMPRENDEDOR}/pedidos`)
  }

  return (
    <main className="flex flex-col gap-5 px-5 pb-10 pt-8">
      <CabeceraAtras titulo={`Pedido #${pedido.id}`} to={`${RUTA_EMPRENDEDOR}/pedidos`} />
      <BadgeEstado tono={pedido.estado === 'Pendiente' ? 'alerta' : 'exito'}>
        {pedido.estado === 'Pendiente' ? 'Pendiente de envío' : pedido.estado}
      </BadgeEstado>
      <Fila etiqueta="Cliente" valor={pedido.cliente} />
      <Fila etiqueta="Fecha" valor={pedido.fecha || '—'} />
      <Fila etiqueta="Dirección" valor={pedido.direccion} />
      <hr className="border-hc-border" />
      <h2 className="text-sm font-bold">Productos</h2>
      {pedido.productos.map((item) => (
        <div key={item.id} className="flex items-center gap-3">
          <Miniatura alt="" size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">{item.nombre}</p>
            <p className="text-[10px] text-hc-muted">x{item.cantidad}</p>
          </div>
          <p className="text-xs font-bold text-hc-primary">{formatoColon(item.precio)}</p>
        </div>
      ))}
      <div className="flex justify-between text-[15px] font-bold">
        <span>Total</span>
        <span className="text-hc-primary">{formatoColon(pedido.total)}</span>
      </div>
      {pedido.estado === 'Pendiente' ? (
        <BotonPrimario onClick={marcarEnviado}>Marcar como enviado</BotonPrimario>
      ) : null}
    </main>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-hc-muted">{etiqueta}</span>
      <span className="font-medium">{valor}</span>
    </div>
  )
}
