import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { orderService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import { formatoColon } from '@/theme/formatoColon'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import {
  ESTADO_LABELS,
  estadoDePedido,
  formatDateShort,
  itemsDePedido,
  pedidosDesdeRespuesta,
  totalDePedido,
  type PedidoCliente,
} from '@/pages/pedidos/pedidoHelpers'
import VisitanteMain, {
  VisitanteBackHeader,
  VisitanteBoton,
  VisitanteEmptyState,
} from './VisitantePiezas'
import { visitanteRuta } from './visitanteMock'

/**
 * Pedidos del visitante: API real dentro del chrome Visitante (sin mock).
 */
export default function VisitantePedidosPage() {
  const toast = useToast()
  const token = useAuthStore((s) => s.token)
  const userId = useAuthStore((s) => s.userId)
  const [orders, setOrders] = useState<PedidoCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!token || !userId) return
    let cancelado = false
    setLoading(true)
    orderService.getByUser(userId, page)
      .then(({ data }) => {
        if (cancelado) return
        const { pedidos, totalPages: paginas } = pedidosDesdeRespuesta(data)
        setOrders(pedidos)
        setTotalPages(paginas)
      })
      .catch(() => {
        if (!cancelado) toast({ message: 'No se pudieron cargar los pedidos', type: 'error' })
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })
    return () => { cancelado = true }
  }, [userId, token, page, toast])

  if (!token) {
    return <Navigate to={rutaLoginConRetorno(visitanteRuta('pedidos'))} replace />
  }

  return (
    <VisitanteMain conNav={false}>
      <VisitanteBackHeader titulo="Mis pedidos" to={visitanteRuta('cuenta')} />
      <PedidosCuerpo
        loading={loading}
        orders={orders}
        page={page}
        totalPages={totalPages}
        onPage={(siguiente) => setPage(siguiente)}
      />
    </VisitanteMain>
  )
}

function PedidosCuerpo({
  loading,
  orders,
  page,
  totalPages,
  onPage,
}: {
  loading: boolean
  orders: PedidoCliente[]
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  if (loading) {
    return <p className="py-10 text-center text-sm text-hc-muted">Cargando pedidos…</p>
  }
  if (orders.length === 0) {
    return (
      <>
        <VisitanteEmptyState
          titulo="Todavía no tenés pedidos"
          detalle="Cuando compres en HotClick, el historial aparece acá."
        />
        <VisitanteBoton to={visitanteRuta('shop')} className="mt-2">
          Ir al shop
        </VisitanteBoton>
      </>
    )
  }
  return (
    <>
      <ul className="flex flex-col">
        {orders.map((order) => (
          <li key={order.id ?? order.numeroPedido}>
            <PedidoFila order={order} />
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <VisitanteBoton
            variant="ghost"
            className="w-auto px-4 py-2 text-xs"
            disabled={page === 0}
            onClick={() => onPage(page - 1)}
          >
            Anterior
          </VisitanteBoton>
          <span className="text-xs text-hc-muted">{page + 1} / {totalPages}</span>
          <VisitanteBoton
            variant="ghost"
            className="w-auto px-4 py-2 text-xs"
            disabled={page >= totalPages - 1}
            onClick={() => onPage(page + 1)}
          >
            Siguiente
          </VisitanteBoton>
        </div>
      ) : null}
    </>
  )
}

function PedidoFila({ order }: { order: PedidoCliente }) {
  const [abierto, setAbierto] = useState(false)
  const estado = estadoDePedido(order)
  const label = ESTADO_LABELS[estado] ?? estado
  const items = itemsDePedido(order)
  const total = totalDePedido(order) ?? 0
  const titulo = order.numeroPedido ?? (order.id != null ? `Pedido #${order.id}` : 'Pedido')

  return (
    <div className="border-b border-hc-border py-4">
      <button
        type="button"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full min-h-11 items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-hc-text">{titulo}</p>
          <p className="mt-0.5 text-[11px] text-hc-muted">
            {formatDateShort(order.fechaPedido)} · {label}
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-hc-primary">{formatoColon(total)}</span>
      </button>
      {abierto ? <PedidoDetalle order={order} items={items} /> : null}
    </div>
  )
}

function PedidoDetalle({
  order,
  items,
}: {
  order: PedidoCliente
  items: ReturnType<typeof itemsDePedido>
}) {
  return (
    <div className="mt-3 space-y-2 rounded-[14px] bg-[var(--hc-blue-50)] p-3">
      {items.length === 0 ? (
        <p className="text-xs text-hc-muted">Sin detalle de productos</p>
      ) : (
        items.map((item, i) => (
          <div key={i} className="flex justify-between gap-2 text-xs text-hc-text">
            <span className="min-w-0 truncate">
              ×{item.cantidad ?? 1}{' '}
              {item.nombreProducto ?? item.producto?.nombreProducto ?? 'Producto'}
            </span>
            <span className="shrink-0 text-hc-muted">
              {formatoColon(item.precioUnitarioMomento ?? item.subtotalItem ?? 0)}
            </span>
          </div>
        ))
      )}
      {order.numeroGuia ? (
        <a
          href={order.urlTracking ?? `https://rastreo.correos.go.cr/?codigo=${order.numeroGuia}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-11 items-center text-xs font-semibold text-hc-accent"
        >
          Rastrear guía {order.numeroGuia}
        </a>
      ) : null}
    </div>
  )
}
