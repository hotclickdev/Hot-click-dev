import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ShippingProgress from '@/components/ui/ShippingProgress'
import { formatPrice } from '@/utils/format'

type MiniCartFooterProps = {
  total: () => number
  onCheckout: () => void
}

export default function MiniCartFooter({ total, onCheckout }: MiniCartFooterProps) {
  const { t } = useTranslation()

  return (
    <div className="px-4 py-4 border-t space-y-3 shrink-0" style={{ borderColor: 'var(--hc-border)' }}>
      <ShippingProgress total={total()} />

      <div className="flex justify-between items-center">
        <span className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>{t('miniCart.total')}</span>
        <span className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>{formatPrice(total())}</span>
      </div>

      <button type="button"
        onClick={onCheckout}
        className="hc-btn hc-btn-primary hc-btn-lg w-full"
      >
        {t('cart.payCard')}
      </button>

      <Link
        to="/carrito"
        className="hc-btn hc-btn-outline w-full"
      >
        {t('miniCart.viewCart')}
      </Link>
    </div>
  )
}
