import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_PAGO } from '@/pages/pago/iconosPago'
import CheckoutChrome from './CheckoutChrome'
import { hrefPedidosCheckout, usaSkinVisitanteCheckout } from './checkoutVisitanteSkin'

type PagoGiftCard = {
  numeroPedido?: string
}

type CheckoutPaidGiftCardProps = {
  pagoData: PagoGiftCard | null
}

/** Pedido pagado entero con tarjeta de regalo (derivado de Figma: confirmación `29:1932` y gift card `55:2220`). */
export default function CheckoutPaidGiftCard({ pagoData }: CheckoutPaidGiftCardProps) {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const skinVisitante = usaSkinVisitanteCheckout(pathname)
  return (
    <CheckoutChrome embedido={skinVisitante}>
      <div className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-[10px] px-4 pb-8 pt-7 text-center leading-[normal] lg:py-10">
        <span className="flex size-[72px] items-center justify-center rounded-full bg-hc-success-bg text-hc-success"><IconoFigma src={ICONOS_PAGO.exitoCheck} size={36} /></span>
        <h1 className="font-display text-[19px] font-bold tracking-normal text-hc-n-900">{t('checkout.giftPagado.titulo')}</h1>
        <p className="text-[14px] leading-5 text-hc-n-600">{t('checkout.giftPagado.texto')}</p>
        {pagoData?.numeroPedido && (
          <p className="flex items-center justify-center gap-[6px] text-[14px] text-hc-n-600">
            {t('checkout.giftPagado.numero')}
            <span className="font-mono text-[15px] font-medium text-hc-n-900">{pagoData.numeroPedido}</span>
          </p>
        )}
        <Link
          to={hrefPedidosCheckout(skinVisitante)}
          className="mt-3 flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-hc-n-0"
        >
          {t('checkout.giftPagado.verPedidos')}
        </Link>
      </div>
    </CheckoutChrome>
  )
}
