import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '@/components/ui/Spinner'
import { RetryBanner } from '@/components/ui/RetryBanner'
import { orderService } from '@/services/orderService'
import { posService } from '@/services/posService'
import { formatDate, formatPrice } from '@/utils/format'
import { useStickyState } from '@/hooks/useStickyState'
import { FILTERS, OrderCard, CrearPedidoModal } from './AdminOrders'

const PERIODOS = [
  { key: 'hoy',    label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes',    label: 'Este mes' },
]

function dentroDelPeriodo(fechaStr, periodo) {
  if (!fechaStr) return false
  const fecha = new Date(fechaStr)
  const ahora = new Date()
  const diffDias = (ahora - fecha) / 86400000
  if (periodo === 'hoy')    return fecha.toDateString() === ahora.toDateString()
  if (periodo === 'semana') return diffDias <= 7
  if (periodo === 'mes')    return diffDias <= 30
  return true
}

const ORD_PAGE_SIZE = 20
// Tarjetas/secciones del mockup no usan borde: solo esta sombra.
const CARD_SHADOW = '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)'
const PILL_BORDER = '#d8cfc0'

/* ── Tab "Ventas" — historial de caja (POS) ──────────────────────── */
function VentasTab() {
  const [ventas, setVentas]   = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('hoy')

  useEffect(() => {
    posService.historial()
      .then(res => setVentas(res?.data ?? []))
      .catch(() => setVentas([]))
      .finally(() => setLoading(false))
  }, [])

  const filtradas = useMemo(
    () => ventas.filter(v => dentroDelPeriodo(v.fechaPedido, periodo))
      .sort((a, b) => new Date(b.fechaPedido) - new Date(a.fechaPedido)),
    [ventas, periodo]
  )

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  return (
    <>
      <div className="flex gap-2 mb-4 flex-wrap">
        {PERIODOS.map(p => (
          <button type="button" key={p.key} onClick={() => setPeriodo(p.key)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={periodo === p.key
              ? { backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid var(--hc-accent)', color: 'var(--hc-accent)', fontWeight: 700 }
              : { backgroundColor: 'var(--hc-surface)', border: `1px solid ${PILL_BORDER}`, color: 'var(--hc-text)' }}>
            {p.label}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
          <p style={{ color: 'var(--hc-muted)' }}>Sin ventas en este período.</p>
          <Link to="/admin/pos" className="text-sm font-semibold mt-2 inline-block" style={{ color: 'var(--hc-accent)' }}>Abrí la caja (POS) →</Link>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
                  {['Venta', 'Hora', 'Artículos', 'Pago', 'Total'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map(v => (
                  <tr key={v.id} className="transition-colors hover:bg-[var(--hc-surface-2)]" style={{ borderTop: '1px solid var(--hc-border)' }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--hc-text)' }}>{v.numeroPedido ?? `#${v.id}`}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>{formatDate(v.fechaPedido)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--hc-text)' }}>
                      {(v.items ?? []).map(i => i.producto?.nombreProducto ?? i.nombre).filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>{v.metodoPago ?? '—'}</td>
                    <td className="px-4 py-3 font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>{formatPrice(v.totalPedido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Tab "Pedidos" — pedidos online / manuales ───────────────────── */
function PedidosTab({ orders, loading, loadError, onRetry, onUpdate, onDelete }) {
  const [filter, setFilter]     = useStickyState('hc-ord-filter', 'Todos')
  const [ordPage, setOrdPage]   = useState(0)
  const changeFilter = (f) => { setFilter(f); setOrdPage(0) }

  const filtered = (filter === 'Todos' ? orders : orders.filter(o => o.estado === filter))
    .slice().sort((a, b) => new Date(b.fechaCreacion ?? 0) - new Date(a.fechaCreacion ?? 0))

  const totalOrdPages = Math.ceil(filtered.length / ORD_PAGE_SIZE)
  const paged = filtered.slice(ordPage * ORD_PAGE_SIZE, (ordPage + 1) * ORD_PAGE_SIZE)

  if (loadError && !loading) {
    return <RetryBanner message="Error al cargar los pedidos. Verificá tu conexión." onRetry={onRetry} />
  }

  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {FILTERS.map(f => (
          <button type="button" key={f} onClick={() => changeFilter(f)}
            className="px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
            style={filter === f
              ? { backgroundColor: 'rgba(23,71,168,0.08)', color: 'var(--hc-accent)', border: '1px solid var(--hc-accent)', fontWeight: 700 }
              : { backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)', border: `1px solid ${PILL_BORDER}` }}>
            {f === 'Todos' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW }}>
          <p style={{ color: 'var(--hc-muted)' }}>
            {filter !== 'Todos' ? `Sin pedidos con estado ${filter}` : 'Todavía no tenés pedidos.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paged.map(order => (
              <OrderCard key={order.id} order={order} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
          {totalOrdPages > 1 && (
            <div className="flex items-center justify-between pt-3">
              <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                {filtered.length} pedidos · página {ordPage + 1} de {totalOrdPages}
              </span>
              <div className="flex gap-1">
                <button type="button" onClick={() => setOrdPage(p => Math.max(0, p - 1))} disabled={ordPage === 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                  style={{ backgroundColor: 'var(--hc-surface)', border: `1px solid ${PILL_BORDER}`, color: 'var(--hc-text)' }}>
                  ← Anterior
                </button>
                <button type="button" onClick={() => setOrdPage(p => Math.min(totalOrdPages - 1, p + 1))} disabled={ordPage >= totalOrdPages - 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                  style={{ backgroundColor: 'var(--hc-surface)', border: `1px solid ${PILL_BORDER}`, color: 'var(--hc-accent)' }}>
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

/* ── Página principal: Ventas y pedidos (Sistema · EMPRENDEDOR) ──── */
export default function SistemaVentasPedidos() {
  const [tab, setTab] = useState('ventas')
  const [showCreate, setShowCreate] = useState(false)

  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState(false)

  const load = () => {
    setLoading(true)
    setLoadError(false)
    orderService.getAll()
      .then(({ data }) => {
        const raw = data?.data ?? data
        setOrders(Array.isArray(raw) ? raw : raw?.content ?? [])
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleUpdate = (id, fields) => setOrders(prev => prev.map(o => o.id === id ? { ...o, ...fields } : o))
  const handleDelete = (id) => setOrders(prev => prev.filter(o => o.id !== id))
  const handleCreated = (newOrder) => { if (newOrder?.id) setOrders(prev => [newOrder, ...prev]); else load() }

  const pendientes = orders.filter(o => o.estado === 'PENDIENTE').length

  return (
    <div className="space-y-4 max-w-[1060px]">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>← Inicio</Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>Ventas y pedidos</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {orders.length} pedido{orders.length === 1 ? '' : 's'} registrado{orders.length === 1 ? '' : 's'}
            {pendientes > 0 ? ` · ${pendientes} pendiente${pendientes === 1 ? '' : 's'} de entregar` : ''}
          </p>
        </div>
        {tab === 'ventas' ? (
          <Link to="/admin/pos"
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}>
            + Registrá una venta
          </Link>
        ) : (
          <button type="button" onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}>
            + Creá un pedido
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="inline-flex gap-1 rounded-xl p-1 w-fit" style={{ backgroundColor: 'var(--hc-surface)' }}>
        <button type="button" onClick={() => setTab('ventas')}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={tab === 'ventas' ? { backgroundColor: 'var(--hc-accent)', color: '#fff' } : { color: 'var(--hc-muted)' }}>
          Ventas
        </button>
        <button type="button" onClick={() => setTab('pedidos')}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          style={tab === 'pedidos' ? { backgroundColor: 'var(--hc-accent)', color: '#fff' } : { color: 'var(--hc-muted)' }}>
          Pedidos
          {pendientes > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: tab === 'pedidos' ? 'rgba(255,255,255,0.25)' : 'rgba(23,71,168,0.12)', color: tab === 'pedidos' ? '#fff' : 'var(--hc-accent)' }}>
              {pendientes}
            </span>
          )}
        </button>
      </div>

      {tab === 'ventas'
        ? <VentasTab />
        : <PedidosTab orders={orders} loading={loading} loadError={loadError} onRetry={load} onUpdate={handleUpdate} onDelete={handleDelete} />
      }

      {showCreate && (
        <CrearPedidoModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
