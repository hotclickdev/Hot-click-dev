import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { formatDate } from '@/utils/format'
import { garantiaDias, primerProducto, MAX_PEDIDOS_RECIENTES } from './perfilHelpers'

export default function ProfileOrdersCard({ orders, loading }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const recentOrders = orders.slice(0, MAX_PEDIDOS_RECIENTES)

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--hc-border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
          📋 {t('profile.recentOrders')}
        </h2>
        <button
          onClick={() => navigate('/mis-pedidos')}
          className="text-xs font-semibold transition-colors"
          style={{ color: 'var(--hc-accent)' }}
        >
          {t('profile.verTodos')} →
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-6"><Spinner /></div>
      )}
      {!loading && recentOrders.length === 0 && (
        <div className="px-5 py-5 text-center">
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('profile.ordersNone')}</p>
        </div>
      )}
      {!loading && recentOrders.length > 0 && (
        <div className="divide-y" style={{ borderColor: 'var(--hc-border)' }}>
          {recentOrders.map((order) => {
            const dias = garantiaDias(order.fechaPedido)
            return (
              <div key={order.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--hc-text)' }}>
                    {primerProducto(order)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                    {formatDate(order.fechaPedido)}
                  </p>
                </div>
                {dias !== null && dias > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-lg shrink-0"
                    style={{ backgroundColor: 'rgba(5,150,105,0.1)', color: '#059669' }}>
                    🛡 {t('profile.warrantyDays', { count: dias })}
                  </span>
                )}
                {dias !== null && dias <= 0 && (
                  <span className="text-[11px] px-2 py-1 rounded-lg shrink-0"
                    style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
                    {t('profile.warrantyExpired')}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
