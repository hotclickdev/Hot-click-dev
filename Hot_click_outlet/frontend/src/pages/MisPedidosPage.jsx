import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import useAuthStore from '@/store/authStore'
import { orderService } from '@/services/orderService'

const ESTADOS = [
  { key: 'PENDIENTE',      label: 'Pendiente',       icon: '🕐' },
  { key: 'PAGADO',         label: 'Pago confirmado',  icon: '✅' },
  { key: 'EN_PREPARACION', label: 'En preparación',   icon: '📦' },
  { key: 'ENVIADO',        label: 'Enviado',           icon: '🚚' },
  { key: 'ENTREGADO',      label: 'Entregado',         icon: '🏠' },
]

const ESTADO_INDEX = Object.fromEntries(ESTADOS.map((e, i) => [e.key, i]))

function estadoColor(e) {
  if (e === 'ENTREGADO')      return { bg: 'rgba(5,150,105,0.12)', text: '#059669', border: 'rgba(5,150,105,0.25)' }
  if (e === 'ENVIADO')        return { bg: 'rgba(79,124,255,0.1)', text: '#4f7cff', border: 'rgba(79,124,255,0.25)' }
  if (e === 'EN_PREPARACION') return { bg: 'rgba(217,119,6,0.1)',  text: '#d97706', border: 'rgba(217,119,6,0.25)' }
  if (e === 'PAGADO')         return { bg: 'rgba(79,124,255,0.08)', text: '#4f7cff', border: 'rgba(79,124,255,0.2)' }
  if (e === 'CANCELADO')      return { bg: 'rgba(220,38,38,0.08)', text: '#dc2626', border: 'rgba(220,38,38,0.2)' }
  return { bg: 'var(--hc-surface-2)', text: 'var(--hc-muted)', border: 'var(--hc-border)' }
}

function formatPrice(n) {
  return '₡' + (n ?? 0).toLocaleString('es-CR')
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Timeline({ estadoActual }) {
  const idx = ESTADO_INDEX[estadoActual] ?? 0
  const estados = ESTADOS.filter(e => e.key !== 'CANCELADO')
  return (
    <div className="flex items-center gap-0 mt-4 mb-2 overflow-x-auto pb-1">
      {estados.map((e, i) => {
        const done    = i <= idx
        const current = i === idx
        return (
          <div key={e.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] transition-all duration-300"
                style={{
                  backgroundColor: done ? 'var(--hc-accent)' : 'var(--hc-surface-2)',
                  border: `2px solid ${done ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                  boxShadow: current ? '0 0 10px rgba(79,124,255,0.4)' : 'none',
                }}
              >
                {done ? <span className="text-white text-[10px]">✓</span> : <span style={{ color: 'var(--hc-muted)', fontSize: 9 }}>○</span>}
              </div>
              <span className="text-[9px] text-center leading-tight max-w-[52px]"
                style={{ color: done ? 'var(--hc-accent)' : 'var(--hc-muted)', fontWeight: done ? 600 : 400 }}>
                {e.label}
              </span>
            </div>
            {i < estados.length - 1 && (
              <div className="h-0.5 flex-1 mx-1 rounded-full transition-all duration-300"
                style={{ backgroundColor: i < idx ? 'var(--hc-accent)' : 'var(--hc-border)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function OrderCard({ order }) {
  const [open, setOpen] = useState(false)
  const estado = order.estadoPedido || order.estado || 'PENDIENTE'
  const colors = estadoColor(estado)
  const items  = order.items ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors"
        style={{ backgroundColor: open ? 'var(--hc-surface-2)' : 'transparent' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-xl">{ESTADOS.find(e => e.key === estado)?.icon ?? '📋'}</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--hc-text)' }}>
              {order.numeroPedido ?? `Pedido #${order.id}`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
              {formatDate(order.fechaPedido)} · {items.length} producto{items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            {formatPrice(order.totalPedido ?? order.total)}
          </span>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
            {ESTADOS.find(e => e.key === estado)?.label ?? estado}
          </span>
          <svg className="w-4 h-4 transition-transform shrink-0" style={{ color: 'var(--hc-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable detail */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid var(--hc-border)' }}>
              {/* Timeline */}
              {estado !== 'CANCELADO' && <Timeline estadoActual={estado} />}

              {/* Items */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--hc-muted)' }}>Productos</p>
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl"
                      style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                          ×{item.cantidad}
                        </span>
                        <span className="text-sm truncate" style={{ color: 'var(--hc-text)' }}>
                          {item.nombreProducto ?? item.producto?.nombreProducto ?? 'Producto'}
                        </span>
                      </div>
                      <span className="text-sm font-medium shrink-0" style={{ color: 'var(--hc-muted)' }}>
                        {formatPrice(item.precioUnitarioMomento ?? item.subtotalItem)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Totales */}
              <div className="rounded-xl p-3 space-y-1.5" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                {order.costoEnvio > 0 && (
                  <div className="flex justify-between text-xs" style={{ color: 'var(--hc-muted)' }}>
                    <span>Envío</span><span>{formatPrice(order.costoEnvio)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1" style={{ color: 'var(--hc-text)', borderTop: '1px solid var(--hc-border)' }}>
                  <span>Total pagado</span>
                  <span style={{ color: 'var(--hc-accent)' }}>{formatPrice(order.totalPedido ?? order.total)}</span>
                </div>
              </div>

              {/* Método de entrega */}
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                📦 {order.metodoEnvio === 'ENVIO_A_DOMICILIO' ? 'Envío a domicilio' : 'Retiro en tienda'}
                {order.notas ? ` · ${order.notas}` : ''}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function MisPedidosPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { userId, token } = useAuthStore()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    if (!userId) return
    setLoading(true)
    orderService.getByUser(userId, page)
      .then(({ data }) => {
        const payload = data?.data ?? data
        if (payload?.content) {
          setOrders(payload.content)
          setTotalPages(payload.totalPages ?? 1)
        } else {
          setOrders(Array.isArray(payload) ? payload : [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, token, page])

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button onClick={() => navigate('/perfil')} className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
            style={{ color: 'var(--hc-muted)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Mi perfil
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Mis pedidos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Historial completo y estado de tus compras
          </p>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : orders.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16 rounded-2xl border"
            style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}>
            <span className="text-5xl opacity-30">📋</span>
            <p className="mt-4 font-medium" style={{ color: 'var(--hc-text)' }}>Aún no tienes pedidos</p>
            <p className="text-sm mt-1 mb-6" style={{ color: 'var(--hc-muted)' }}>¡Explora la tienda y haz tu primera compra!</p>
            <Button onClick={() => navigate('/productos')}>Ver productos</Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, i) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <OrderCard order={order} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-3 mt-8">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              ← Anterior
            </Button>
            <span className="text-sm self-center" style={{ color: 'var(--hc-muted)' }}>
              {page + 1} / {totalPages}
            </span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Siguiente →
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
