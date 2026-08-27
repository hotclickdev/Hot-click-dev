import { Link, useParams } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { pedidoPorId, type PedidoMock } from './mock'
import { Boton, EncabezadoPagina, Miniatura } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'

/**
 * Detalle de pedido (Figma 127:290 / 126:297).
 */
export default function PedidoDetallePage() {
  const { id } = useParams()
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const pedido = id ? pedidoPorId(plan.id, id) : undefined
  if (!pedido) {
    return (
      <main className="px-5 py-16">
        <p className="text-sm text-hc-muted">No encontramos ese pedido.</p>
        <Link to={ruta('pedidos')} className="mt-4 inline-flex min-h-11 text-sm font-semibold text-hc-accent">Volver a pedidos</Link>
      </main>
    )
  }
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo={`Pedido #${pedido.id}`} volverA={ruta('pedidos')} />
      <span className="rounded-full px-3 py-1 text-xs" style={{ background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)' }}>
        {pedido.estado === 'Pendiente' ? 'Pendiente de envío' : pedido.estado}
      </span>
      <dl className="mt-5 space-y-3 text-sm">
        <FilaDato label="Cliente" valor={pedido.cliente} />
        {pedido.sucursal ? <FilaDato label="Sucursal" valor={pedido.sucursal} /> : null}
        <FilaDato label="Fecha" valor={pedido.fecha} />
        <FilaDato label="Dirección" valor={pedido.direccion} />
      </dl>
      <hr className="my-4 border-hc-border" />
      <h2 className="mb-3 font-semibold">Productos</h2>
      <ListaItems pedido={pedido} />
      <div className="mt-4 flex justify-between text-base font-bold">
        <span>Total</span>
        <span>{formatoColon(pedido.total)}</span>
      </div>
      {pedido.estado === 'Pendiente' ? (
        <div className="mt-6">
          <Boton to={ruta('pedidos')}>Marcar como enviado</Boton>
        </div>
      ) : null}
    </main>
  )
}

function ListaItems({ pedido }: { pedido: PedidoMock }) {
  return (
    <ul className="space-y-3">
      {pedido.items.map((item) => (
        <li key={item.nombre} className="flex items-center gap-3">
          <Miniatura className="size-12" />
          <div className="flex-1">
            <p className="text-sm">{item.nombre}</p>
            <p className="text-xs text-hc-muted">x{item.cantidad}</p>
          </div>
          <span className="text-sm">{formatoColon(item.precio * item.cantidad)}</span>
        </li>
      ))}
    </ul>
  )
}

function FilaDato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-hc-muted">{label}</dt>
      <dd>{valor}</dd>
    </div>
  )
}
