import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IndicadorPasos } from './PiezasCheckout'
import CheckoutChrome from './CheckoutChrome'
import TilopayCardForm from './TilopayCardForm'
import type { TilopayCardPayload } from '@/hooks/usePayment'

type CheckoutTilopayCardProps = {
  payload: TilopayCardPayload
  onVolver?: () => void
}

/**
 * Pantalla de checkout cuando el pago pasa a tarjeta embebida Tilopay (derivado de Figma: paso 3 · Pago de
 * `28:1096`, tarjeta clara de 14 y campos de `28:1112`).
 */
export default function CheckoutTilopayCard({ payload, onVolver }: CheckoutTilopayCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <CheckoutChrome>
      <div className="mx-auto max-w-md py-6 lg:py-10">
        <IndicadorPasos paso={3} onIr={() => navigate('/checkout')} />
        <div className="mx-4 mt-2 flex flex-col gap-4 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4 leading-[normal]">
          <div>
            <h1 className="font-display text-[19px] font-bold tracking-normal text-hc-n-900">
              {t('checkout.tilopayTitle')}
            </h1>
            <p className="mt-1 text-[13px] leading-[18px] text-hc-n-600">
              {t('checkout.tilopaySubtitle', { order: payload.orderNumber || payload.numeroPedido })}
            </p>
          </div>
          <TilopayCardForm
            sdkToken={payload.sdkToken}
            monto={payload.monto}
            moneda={payload.moneda}
            orderNumber={payload.orderNumber}
            redirectUrl={payload.redirectUrl}
            onVolver={onVolver}
          />
        </div>
      </div>
    </CheckoutChrome>
  )
}
