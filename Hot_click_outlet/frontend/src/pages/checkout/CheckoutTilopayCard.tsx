import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import CheckoutStepper from '@/components/ui/CheckoutStepper'
import CheckoutChrome from './CheckoutChrome'
import TilopayCardForm from './TilopayCardForm'
import type { TilopayCardPayload } from '@/hooks/usePayment'

type CheckoutTilopayCardProps = {
  payload: TilopayCardPayload
  onVolver?: () => void
}

/** Pantalla de checkout cuando el pago pasa a tarjeta embebida Tilopay. */
export default function CheckoutTilopayCard({ payload, onVolver }: CheckoutTilopayCardProps) {
  const { t } = useTranslation()

  return (
    <CheckoutChrome>
      <div className="mx-auto max-w-md px-4 py-14">
        <CheckoutStepper activeStep="checkout" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-4 rounded-2xl p-6"
          style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
        >
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>
              {t('checkout.tilopayTitle')}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
              {t('checkout.tilopaySubtitle', { order: payload.orderNumber || payload.numeroPedido })}
            </p>
          </div>
          <TilopayCardForm
            sdkToken={payload.sdkToken}
            monto={payload.monto}
            orderNumber={payload.orderNumber}
            redirectUrl={payload.redirectUrl}
            onVolver={onVolver}
          />
        </motion.div>
      </div>
    </CheckoutChrome>
  )
}
