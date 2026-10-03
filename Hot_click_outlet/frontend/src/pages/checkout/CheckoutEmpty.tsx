import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import CheckoutChrome from './CheckoutChrome'
import { ICONOS_CHECKOUT } from './iconosCheckout'
import { hrefCatalogoCheckout, usaSkinVisitanteCheckout } from './checkoutVisitanteSkin'

/** Checkout sin productos (derivado de Figma: carrito vacío `45:1692`). */
export default function CheckoutEmpty() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const skinVisitante = usaSkinVisitanteCheckout(pathname)
  return (
    <CheckoutChrome embedido={skinVisitante}>
      <div className="py-10">
        <EstadoVacio
          nivel="h1"
          icono={<IconoFigma src={ICONOS_CHECKOUT.carritoVacio} size={28} />}
          titulo={t('checkout.cartEmpty')}
          accion={{ texto: t('checkout.continueShopping'), to: hrefCatalogoCheckout(skinVisitante) }}
        />
      </div>
    </CheckoutChrome>
  )
}
