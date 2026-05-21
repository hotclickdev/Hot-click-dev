import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import useAuthStore from '@/store/authStore'
import { orderService } from '@/services/orderService'

const STATUS_ICONS = {
  PENDIENTE:      '🕐',
  PAGADO:         '✅',
  EN_PREPARACION: '📦',
  ENVIADO:        '🚚',
  ENTREGADO:      '🏠',
  LISTO_RETIRO:   '🏪',
  CANCELADO:      '❌',
}

function estadoColor(e) {
  if (e === 'ENTREGADO')      return { bg: 'rgba(5,150,105,0.12)', text: '#059669', border: 'rgba(5,150,105,0.25)' }
  if (e === 'ENVIADO')        return { bg: 'rgba(79,124,255,0.1)', text: '#4f7cff', border: 'rgba(79,124,255,0.25)' }
  if (e === 'LISTO_RETIRO')   return { bg: 'rgba(5,150,105,0.1)',  text: '#059669', border: 'rgba(5,150,105,0.25)' }
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

function Timeline({ estadoActual, esRetiro }) {
  const { t } = useTranslation()

  const estadosEnvio = [
    { key: 'PENDIENTE',      label: t('orders.status.PENDIENTE'),      icon: '🕐' },
    { key: 'PAGADO',         label: t('orders.status.PAGADO'),         icon: '✅' },
    { key: 'EN_PREPARACION', label: t('orders.status.EN_PREPARACION'), icon: '📦' },
    { key: 'ENVIADO',        label: t('orders.status.ENVIADO'),        icon: '🚚' },
    { key: 'ENTREGADO',      label: t('orders.status.ENTREGADO'),      icon: '🏠' },
  ]

  const estadosRetiro = [
    { key: 'PENDIENTE',      label: t('orders.status.PENDIENTE'),       icon: '🕐' },
    { key: 'PAGADO',         label: t('orders.status.PAGADO'),          icon: '✅' },
    { key: 'EN_PREPARACION', label: t('orders.status.EN_PREPARACION'),  icon: '📦' },
    { key: 'LISTO_RETIRO',   label: t('orders.status.LISTO_RETIRO'),    icon: '🏪' },
    { key: 'ENTREGADO',      label: t('orders.status.ENTREGADO_RETIRO'), icon: '🏠' },
  ]

  const estados = esRetiro ? estadosRetiro : estadosEnvio
  const idx = estados.findIndex(e => e.key === estadoActual)
  const idxSafe = idx === -1 ? 0 : idx

  return (
    <div className="flex items-center gap-0 mt-4 mb-2 overflow-x-auto pb-1">
      {estados.map((e, i) => {
        const done    = i <= idxSafe
        const current = i === idxSafe
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

function GarantiaBar({ fechaPedido }) {
  const { t } = useTranslation()
  if (!fechaPedido) return null

  const limite = new Date(fechaPedido)
  limite.setDate(limite.getDate() + 40)
  const diasRestantes = Math.ceil((limite - new Date()) / 86400000)
  const vence = limite.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })

  if (diasRestantes > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
        style={{ backgroundColor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>
        <span>🛡</span>
        <span className="font-medium" style={{ color: '#059669' }}>{t('orders.warrantyActive')}</span>
        <span className="text-xs ml-auto" style={{ color: '#059669' }}>
          {t('orders.warrantyDays', { count: diasRestantes })} · {t('orders.expires')} {vence}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
      style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
      <span>⏱</span>
      <span style={{ color: 'var(--hc-muted)' }}>{t('orders.warrantyExpired')}</span>
      <span className="text-xs ml-auto" style={{ color: 'var(--hc-muted)' }}>{t('orders.expired')} {vence}</span>
    </div>
  )
}

const ESTADO_LABELS = {
  PENDIENTE:      'Pendiente',
  PAGADO:         'Pago confirmado',
  EN_PREPARACION: 'En preparación',
  LISTO_RETIRO:   'Listo p/ retirar',
  ENVIADO:        'Enviado',
  ENTREGADO:      'Entregado',
  CANCELADO:      'Cancelado',
}

function NotificacionesTab({ notificaciones }) {
  const list = Array.isArray(notificaciones) ? notificaciones : []
  if (list.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>No hay notificaciones todavía</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {[...list].reverse().map((n, i) => (
        <div key={i} className="rounded-xl px-4 py-3 space-y-1"
          style={{ backgroundColor: 'rgba(79,124,255,0.06)', border: '1px solid rgba(79,124,255,0.15)' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(79,124,255,0.12)', color: '#4f7cff' }}>
              {ESTADO_LABELS[n.estado] ?? n.estado}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>
              {n.fecha ? new Date(n.fecha).toLocaleString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--hc-text)' }}>{n.nota}</p>
        </div>
      ))}
    </div>
  )
}

function OrderCard({ order }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState('detalle')
  const estado = order.estadoPedido ?? order.estado ?? 'PENDIENTE'
  const colors = estadoColor(estado)
  const items  = order.items ?? []
  const notificaciones = Array.isArray(order.notificaciones) ? order.notificaciones : []
  const hasNotifs = notificaciones.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
    >
      <button
        onClick={() => { setOpen(v => !v); if (open) setTab('detalle') }}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors"
        style={{ backgroundColor: open ? 'var(--hc-surface-2)' : 'transparent' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-xl">{STATUS_ICONS[estado] ?? '📋'}</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--hc-text)' }}>
              {order.numeroPedido ?? `Pedido #${order.id}`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
              {formatDate(order.fechaPedido)} · {t('orders.item', { count: items.length })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            {formatPrice(order.totalPedido ?? order.total)}
          </span>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
            {t(`orders.status.${estado}`, { defaultValue: estado })}
          </span>
          <svg className="w-4 h-4 transition-transform shrink-0"
            style={{ color: 'var(--hc-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div style={{ borderTop: '1px solid var(--hc-border)' }}>
              {/* Tab bar */}
              <div className="flex border-b" style={{ borderColor: 'var(--hc-border)' }}>
                {['detalle', 'notificaciones'].map(t_ => (
                  <button
                    key={t_}
                    onClick={() => setTab(t_)}
                    className="relative px-5 py-3 text-xs font-semibold transition-colors"
                    style={{ color: tab === t_ ? 'var(--hc-accent)' : 'var(--hc-muted)' }}
                  >
                    {t_ === 'detalle' ? 'Detalle' : (
                      <span className="flex items-center gap-1.5">
                        Notificaciones
                        {hasNotifs && (
                          <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                            style={{ backgroundColor: '#4f7cff', color: '#fff' }}>
                            {notificaciones.length}
                          </span>
                        )}
                      </span>
                    )}
                    {tab === t_ && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--hc-accent)' }} />
                    )}
                  </button>
                ))}
              </div>

              {tab === 'detalle' ? (
                <div className="px-5 pb-5 space-y-4 pt-4">
                  {estado !== 'CANCELADO' && (
                    <Timeline estadoActual={estado} esRetiro={order.metodoEnvio === 'RETIRO_EN_TIENDA'} />
                  )}

                  {items.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--hc-muted)' }}>
                        {t('orders.products')}
                      </p>
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

                  <div className="rounded-xl p-3 space-y-1.5" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                    {order.costoEnvio > 0 && (
                      <div className="flex justify-between text-xs" style={{ color: 'var(--hc-muted)' }}>
                        <span>{t('orders.shipping')}</span><span>{formatPrice(order.costoEnvio)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold pt-1"
                      style={{ color: 'var(--hc-text)', borderTop: '1px solid var(--hc-border)' }}>
                      <span>{t('orders.totalPaid')}</span>
                      <span style={{ color: 'var(--hc-accent)' }}>{formatPrice(order.totalPedido ?? order.total)}</span>
                    </div>
                  </div>

                  <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    📦 {order.metodoEnvio === 'ENVIO_A_DOMICILIO' ? t('orders.homeDelivery') : t('orders.storePickup')}
                    {order.notas ? ` · ${order.notas}` : ''}
                  </p>

                  {order.numeroGuia && (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ backgroundColor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#059669' }}>
                          🚚 {t('orders.trackingLabel')}
                        </p>
                        <p className="text-sm font-mono font-bold mt-0.5" style={{ color: '#059669' }}>
                          {order.numeroGuia}
                        </p>
                      </div>
                      <a
                        href={order.urlTracking ?? `https://rastreo.correos.go.cr/?codigo=${order.numeroGuia}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: '#059669', color: '#fff' }}
                      >
                        {t('orders.track')}
                      </a>
                    </div>
                  )}

                  {!['CANCELADO', 'PENDIENTE'].includes(estado) && (
                    <GarantiaBar fechaPedido={order.fechaPedido} />
                  )}
                </div>
              ) : (
                <div className="px-5 pb-5 pt-4">
                  <NotificacionesTab notificaciones={notificaciones} />
                </div>
              )}
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button onClick={() => navigate('/perfil')} className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
            style={{ color: 'var(--hc-muted)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('nav.perfil')}
          </button>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>{t('nav.misPedidos')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{t('orders.subtitle')}</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : orders.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16 rounded-2xl border"
            style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}>
            <span className="text-5xl opacity-30">📋</span>
            <p className="mt-4 font-medium" style={{ color: 'var(--hc-text)' }}>{t('orders.empty')}</p>
            <p className="text-sm mt-1 mb-6" style={{ color: 'var(--hc-muted)' }}>{t('orders.emptySub')}</p>
            <Button onClick={() => navigate('/productos')}>{t('orders.viewProducts')}</Button>
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

        {totalPages > 1 && (
          <div className="flex justify-center gap-3 mt-8">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              ← {t('common.previous')}
            </Button>
            <span className="text-sm self-center" style={{ color: 'var(--hc-muted)' }}>
              {page + 1} / {totalPages}
            </span>
            <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              {t('common.next')} →
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
