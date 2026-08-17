import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { orderService } from '@/services/orderService'
import ImportExportBar from '@/components/admin/ImportExportBar'
import { RetryBanner } from '@/components/ui/RetryBanner'
import { useStickyState } from '@/hooks/useStickyState'
import CrearPedidoModal from './ordenes/CrearPedidoModal'
import OrderCard from './ordenes/AdminOrderCard'
import OrdersEmptyState from './ordenes/OrdersEmptyState'
import {
  COLUMNAS_EXPORT_PEDIDOS,
  FILTERS,
  ORD_PAGE_SIZE,
  filasExportPedidos,
  listaPedidosDesdeRespuesta,
  pedidosFiltradosOrdenados,
} from './ordenes/ordenesHelpers'

export { FILTERS } from './ordenes/ordenesHelpers'
export { default as CrearPedidoModal } from './ordenes/CrearPedidoModal'
export { default as OrderCard } from './ordenes/AdminOrderCard'

export default function AdminOrders() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter] = useStickyState('hc-ord-filter', 'Todos')
  const [sortDesc, setSortDesc] = useState(true)
  const [ordPage, setOrdPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const changeFilter = (f) => { setFilter(f); setOrdPage(0) }

  const load = () => {
    orderService.getAll()
      .then(({ data }) => setOrders(listaPedidosDesdeRespuesta(data)))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleUpdate = (id, fields) =>
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...fields } : o))
  const handleDelete = (id) =>
    setOrders((prev) => prev.filter((o) => o.id !== id))
  const handleCreated = (newOrder) => {
    if (newOrder?.id) { setOrders((prev) => [newOrder, ...prev]); return }
    setLoading(true)
    load()
  }

  const filtered = pedidosFiltradosOrdenados(orders, filter, sortDesc)
  const totalOrdPages = Math.ceil(filtered.length / ORD_PAGE_SIZE)
  const paged = filtered.slice(ordPage * ORD_PAGE_SIZE, (ordPage + 1) * ORD_PAGE_SIZE)

  return (
    <>
      <div className="space-y-5">
        {loadError && !loading && (
          <RetryBanner message="Error al cargar los pedidos. Verificá tu conexión." onRetry={() => { setLoadError(false); setLoading(true); load() }} />
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--hc-text)]">{t('adminOrders.title')}</h1>
            <p className="text-sm text-[var(--hc-muted)] mt-0.5">{filtered.length} pedidos{filter !== 'Todos' ? ` · ${filter}` : ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ImportExportBar
              exportOnly
              data={filasExportPedidos(orders)}
              columns={COLUMNAS_EXPORT_PEDIDOS}
              filename="pedidos"
              sheetName="Pedidos"
            />
            <button
              onClick={() => setSortDesc((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all shrink-0"
              style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}
              title={sortDesc ? 'Ordenar: más antiguos primero' : 'Ordenar: más recientes primero'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                {sortDesc
                  ? <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/></>
                  : <><line x1="3" y1="6" x2="9" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                }
              </svg>
              {sortDesc ? 'Recientes' : 'Antiguos'}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0"
              style={{ backgroundColor: 'var(--hc-accent)', color: 'white' }}
            >
              {t('adminOrders.newOrderBtn')}
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => changeFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: filter === f ? 'var(--hc-accent)' : 'color-mix(in srgb, var(--hc-text) 5%, transparent)',
                color: filter === f ? 'white' : 'var(--hc-muted)',
                border: `1px solid ${filter === f ? 'color-mix(in srgb, var(--hc-accent) 40%, transparent)' : 'var(--hc-border)'}`,
              }}
            >
              {f === 'Todos' ? t('adminOrders.filterAll') : f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <OrdersEmptyState filter={filter} onVerTodos={() => changeFilter('Todos')} onCrear={() => setShowCreate(true)} />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paged.map((order) => (
                <OrderCard key={order.id} order={order} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))}
            </div>
            {totalOrdPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  {filtered.length} pedidos · página {ordPage + 1} de {totalOrdPages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setOrdPage((p) => Math.max(0, p - 1))}
                    disabled={ordPage === 0}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setOrdPage((p) => Math.min(totalOrdPages - 1, p + 1))}
                    disabled={ordPage >= totalOrdPages - 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {showCreate && (
        <CrearPedidoModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
