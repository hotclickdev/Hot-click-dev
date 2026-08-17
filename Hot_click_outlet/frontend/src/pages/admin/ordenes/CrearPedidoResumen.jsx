import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'

export default function CrearPedidoResumen({ subtotal, costoEnvioNum, total }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl px-4 py-3 space-y-1.5" style={{ backgroundColor: 'var(--hc-glass-bg)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest mb-2">{t('adminOrders.subtotal')}</p>
      <div className="flex justify-between text-sm text-[var(--hc-muted)]">
        <span>{t('adminOrders.productsLabel')}</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      {costoEnvioNum > 0 && (
        <div className="flex justify-between text-sm text-[var(--hc-muted)]">
          <span>{t('adminOrders.shippingCost')}</span>
          <span>{formatPrice(costoEnvioNum)}</span>
        </div>
      )}
      <div className="flex justify-between text-base font-bold text-[var(--hc-text)] pt-1 border-t" style={{ borderColor: 'var(--hc-border)' }}>
        <span>{t('adminOrders.total')}</span>
        <span>{formatPrice(total)}</span>
      </div>
    </div>
  )
}
