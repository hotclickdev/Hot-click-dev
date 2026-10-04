import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CargaComprador from '@/components/comprador/estados/CargaComprador'
import CheckoutChrome from './CheckoutChrome'
import { usaSkinVisitanteCheckout } from './checkoutVisitanteSkin'

type CheckoutLoadingProps = {
  estado: string
}

/** Preparando el checkout o redirigiendo al pago (derivado de Figma, ver `CargaComprador`). */
export default function CheckoutLoading({ estado }: CheckoutLoadingProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const skinVisitante = usaSkinVisitanteCheckout(pathname)
  const msg = estado === 'redirecting'
    ? t('checkout.redirectingPayment', { defaultValue: 'Redirigiendo al pago seguro…' })
    : t('checkout.preparing')
  return (
    <CheckoutChrome embedido={skinVisitante}>
      <div className="py-16">
        <CargaComprador titulo={msg} texto={t('checkout.dontClose')} />
      </div>
    </CheckoutChrome>
  )
}
