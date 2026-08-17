import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import GarantiaBar from './GarantiaBar'
import NotificacionesTab from './NotificacionesTab'
import PedidoTimeline from './PedidoTimeline'
import {
  ESTADOS_SIN_ACCION,
  STATUS_ICONS,
  colorEstadoPedido,
  estadoDePedido,
  formatDateShort,
  formatPrice,
  itemsDePedido,
  notificacionesDePedido,
  totalDePedido,
} from './pedidoHelpers'

function TabBar({ tab, onTab, notifCount }) {
  return (
    <div className="flex border-b" style={{ borderColor: 'var(--hc-border)' }}>
      {['detalle', 'notificaciones'].map((id) => (
        <button
          key={id}
          onClick={() => onTab(id)}
          className="relative px-5 py-3 text-xs font-semibold transition-colors"
          style={{ color: tab === id ? 'var(--hc-accent)' : 'var(--hc-muted)' }}
        >
          {id === 'detalle' ? 'Detalle' : (
            <span className="flex items-center gap-1.5">
              Notificaciones
              {notifCount > 0 && (
                <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                  {notifCount}
                </span>
              )}
            </span>
          )}
          {tab === id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
              style={{ backgroundColor: 'var(--hc-accent)' }} />
          )}
        </button>
      ))}
    </div>
  )
}

function DetallePedido({ order, estado, items }) {
  const { t } = useTranslation()
  return (
    <div className="px-5 pb-5 space-y-4 pt-4">
      {estado !== 'CANCELADO' && (
        <PedidoTimeline estadoActual={estado} esRetiro={order.metodoEnvio === 'RETIRO_EN_TIENDA'} />
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
          <span style={{ color: 'var(--hc-accent)' }}>{formatPrice(totalDePedido(order))}</span>
        </div>
      </div>
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
        {order.metodoEnvio === 'ENVIO_A_DOMICILIO' ? t('orders.homeDelivery') : t('orders.storePickup')}
        {order.notas ? ` · ${order.notas}` : ''}
      </p>
      {order.numeroGuia && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
          style={{ backgroundColor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#059669' }}>
              {t('orders.trackingLabel')}
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
      {!ESTADOS_SIN_ACCION.has(estado) && (
        <GarantiaBar fechaPedido={order.fechaPedido} />
      )}
    </div>
  )
}

export default function OrderCard({ order }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('detalle')
  const estado = estadoDePedido(order)
  const colors = colorEstadoPedido(estado)
  const items = itemsDePedido(order)
  const notificaciones = notificacionesDePedido(order)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
    >
      <button
        onClick={() => { setOpen((v) => !v); if (open) setTab('detalle') }}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors"
        style={{ backgroundColor: open ? 'var(--hc-surface-2)' : 'transparent' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-xl">{STATUS_ICONS[estado] ?? '·'}</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--hc-text)' }}>
              {order.numeroPedido ?? `Pedido #${order.id}`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
              {formatDateShort(order.fechaPedido)} · {t('orders.item', { count: items.length })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            {formatPrice(totalDePedido(order))}
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
              <TabBar tab={tab} onTab={setTab} notifCount={notificaciones.length} />
              {tab === 'detalle'
                ? <DetallePedido order={order} estado={estado} items={items} />
                : <div className="px-5 pb-5 pt-4"><NotificacionesTab notificaciones={notificaciones} /></div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
