import { formatDateShort, formatPrice } from '@/utils/format'
import EstadoBadge from './EstadoBadge'
import TabEmpty from './TabEmpty'
import TabLoader from './TabLoader'

function PedidoRow({ pedido }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: 'var(--hc-text)' }}>#{pedido.id}</span>
          <EstadoBadge estado={pedido.estado} />
        </div>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--hc-muted)' }}>{pedido.cliente}</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--hc-muted)' }}>{pedido.metodoPago} · {formatDateShort(pedido.fecha)}</p>
      </div>
      <span className="text-sm font-bold shrink-0" style={{ color: 'var(--hc-text)' }}>
        {formatPrice(pedido.total)}
      </span>
    </div>
  )
}

export default function TabPedidos({ loading, pedidos }) {
  if (loading) return <TabLoader />
  if (!pedidos || pedidos.length === 0) return <TabEmpty text="Sin pedidos aún" />
  return (
    <div className="space-y-2">
      {pedidos.map((p) => <PedidoRow key={p.id} pedido={p} />)}
    </div>
  )
}
