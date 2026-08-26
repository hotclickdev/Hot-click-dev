import { useTranslation } from 'react-i18next'
import { WhatsAppIcon } from './checkoutIcons'

/**
 * Atajo a WhatsApp. No es un método de pago: el cobro se cierra abajo.
 */
export default function ExpressCheckout({ onWhatsApp }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onWhatsApp}
      className="w-full min-h-11 inline-flex items-center justify-center gap-2 text-sm font-medium"
      style={{ color: 'var(--hc-muted)' }}
    >
      <WhatsAppIcon />
      {t('cart.orderWhatsapp')}
    </button>
  )
}
