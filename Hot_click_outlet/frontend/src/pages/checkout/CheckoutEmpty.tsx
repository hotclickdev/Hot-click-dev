import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CheckoutChrome from './CheckoutChrome'
import { hrefCatalogoCheckout, usaSkinVisitanteCheckout } from './checkoutVisitanteSkin'

export default function CheckoutEmpty() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const skinVisitante = usaSkinVisitanteCheckout(pathname)
  return (
    <CheckoutChrome embedido={skinVisitante}>
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-lg mb-4" style={{ color: 'var(--hc-text)' }}>{t('checkout.cartEmpty')}</p>
        <Link to={hrefCatalogoCheckout(skinVisitante)} className="hc-btn hc-btn-primary min-h-11">
          {t('checkout.continueShopping')}
        </Link>
      </div>
    </CheckoutChrome>
  )
}
