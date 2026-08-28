import { useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import { RetryBanner } from '@/components/ui/RetryBanner'
import { useStickyState } from '@/hooks/useStickyState'
import { ORD_PAGE_SIZE } from '../ordenes/ordenesHelpers'
import OrderCard from '../ordenes/AdminOrderCard'
import {
  CARD_SHADOW,
  FILTROS_PEDIDOS_SISTEMA,
  PILL_BORDER,
  estiloPildora,
  pedidosDelFiltro,
  textoVacioPedidos,
} from './ventasPedidosHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { Id } from '@/types/api'
import type { Pedido } from '@/types/pedido'

export default function PedidosTab({ orders, loading, loadError, onRetry, onUpdate, onDelete }: {
  orders: Pedido[]
  loading: boolean
  loadError: boolean
  onRetry: () => void
  onUpdate: (id: Id, fields: Partial<Pedido>) => void
  onDelete: (id: Id) => void
}) {
  const [filter, setFilter] = useStickyState('hc-ord-filter-sistema', 'por_despachar')
  const [ordPage, setOrdPage] = useState(0)
  const changeFilter = (f: string) => { setFilter(f); setOrdPage(0) }

  const filtered = pedidosDelFiltro(orders, filter)
    .slice().sort((a, b) => new Date(b.fechaCreacion ?? 0).getTime() - new Date(a.fechaCreacion ?? 0).getTime())

  const totalOrdPages = Math.ceil(filtered.length / ORD_PAGE_SIZE)
  const paged = filtered.slice(ordPage * ORD_PAGE_SIZE, (ordPage + 1) * ORD_PAGE_SIZE)

  if (loadError && !loading) {
    return <RetryBanner message="Error al cargar los pedidos. Verificá tu conexión." onRetry={onRetry} />
  }

  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {FILTROS_PEDIDOS_SISTEMA.map((f) => (
          <button type="button" key={f.key} onClick={() => changeFilter(f.key)}
            className="px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
            style={estiloPildora(filter === f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <PedidosCuerpo
        loading={loading}
        filter={filter}
        filtered={filtered}
        paged={paged}
        ordPage={ordPage}
        totalOrdPages={totalOrdPages}
        setOrdPage={setOrdPage}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </>
  )
}

function PedidosCuerpo({ loading, filter, filtered, paged, ordPage, totalOrdPages, setOrdPage, onUpdate, onDelete }: {
  loading: boolean
  filter: string
  filtered: Pedido[]
  paged: Pedido[]
  ordPage: number
  totalOrdPages: number
  setOrdPage: (n: number | ((prev: number) => number)) => void
  onUpdate: (id: Id, fields: Partial<Pedido>) => void
  onDelete: (id: Id) => void
}) {
  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
        <p style={{ color: 'var(--hc-muted)' }}>{textoVacioPedidos(filter)}</p>
      </div>
    )
  }
  return (
    <>
      <div className="space-y-2">
        {paged.map(order => (
          <OrderCard key={order.id} order={order} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
      {totalOrdPages > 1 && (
        <PaginacionPedidos
          total={filtered.length}
          ordPage={ordPage}
          totalOrdPages={totalOrdPages}
          setOrdPage={setOrdPage}
        />
      )}
    </>
  )
}

function PaginacionPedidos({ total, ordPage, totalOrdPages, setOrdPage }: {
  total: number
  ordPage: number
  totalOrdPages: number
  setOrdPage: (n: number | ((prev: number) => number)) => void
}) {
  return (
    <div className="flex items-center justify-between pt-3">
      <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
        {total} pedidos · página {ordPage + 1} de {totalOrdPages}
      </span>
      <div className="flex gap-1">
        <button type="button" onClick={() => setOrdPage(p => Math.max(0, p - 1))} disabled={ordPage === 0}
          className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
          style={{ backgroundColor: 'var(--hc-surface)', border: `1px solid ${PILL_BORDER}`, color: 'var(--hc-text)' }}>
          <TextoFlecha dir="atras">Anterior</TextoFlecha>
        </button>
        <button type="button" onClick={() => setOrdPage(p => Math.min(totalOrdPages - 1, p + 1))} disabled={ordPage >= totalOrdPages - 1}
          className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
          style={{ backgroundColor: 'var(--hc-surface)', border: `1px solid ${PILL_BORDER}`, color: 'var(--hc-accent)' }}>
          <TextoFlecha>Siguiente</TextoFlecha>
        </button>
      </div>
    </div>
  )
}
