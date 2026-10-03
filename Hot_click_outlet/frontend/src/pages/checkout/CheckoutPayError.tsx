import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ICONOS_CHECKOUT } from './iconosCheckout'
import { WHATSAPP } from './checkoutHelpers'
import type { ReactNode, RefObject } from 'react'
import type { TFunction } from 'i18next'

function WhatsAppAtajo({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 text-[13px] font-semibold text-hc-n-900"
    >
      <img src={ICONOS_CHECKOUT.whatsapp} alt="" className="size-[18px]" />
      {children}
    </a>
  )
}

function ErrorStock({
  productoBloqueado,
  rutaCarrito,
}: {
  productoBloqueado: string | null
  rutaCarrito: string
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <p>
        {productoBloqueado
          ? <>{t('checkout.errorStock.productoAntes')} <strong className="font-semibold text-hc-n-900">"{productoBloqueado}"</strong> {t('checkout.errorStock.productoDespues')}</>
          : t('checkout.errorStock.varios')}
      </p>
      <p className="text-[12px] leading-4 text-hc-n-600">
        {t('checkout.errorStock.retirar')}
      </p>
      <Link to={rutaCarrito} className="mt-1 flex min-h-12 w-full items-center justify-center rounded-[12px] bg-hc-red-500 px-4 text-[15px] font-semibold text-hc-n-0 hover:bg-hc-red-600">
        {t('checkout.errorStock.irPedido')}
      </Link>
    </div>
  )
}

function ErrorPago({
  errorStr, intentos, maxIntentos, onPagar, t,
}: {
  errorStr: string
  intentos: number
  maxIntentos: number
  onPagar: () => void
  t: TFunction
}) {
  return (
    <div className="space-y-3">
      <p>{errorStr}</p>
      {intentos < maxIntentos && (
        <button type="button" onClick={onPagar} className="flex min-h-12 w-full items-center justify-center rounded-[12px] bg-hc-red-500 px-4 text-[15px] font-semibold text-hc-n-0 hover:bg-hc-red-600">
          {t('checkout.retry', { remaining: maxIntentos - intentos })}
        </button>
      )}
    </div>
  )
}

type CheckoutPayErrorProps = {
  estado: string
  error: unknown
  intentos: number
  maxIntentos: number
  onPagar: () => void
  toWhatsAppMessage: () => string
  errorBannerRef: RefObject<HTMLDivElement | null>
  rutaCarrito?: string
}

/** Error al pagar en el checkout (derivado de Figma: aviso rojo claro y botón de 12 de `29:1999`). */
export default function CheckoutPayError({
  estado,
  error,
  intentos,
  maxIntentos,
  onPagar,
  toWhatsAppMessage,
  errorBannerRef,
  rutaCarrito = '/carrito',
}: CheckoutPayErrorProps) {
  const { t } = useTranslation()
  if (estado !== 'failed' || !error) return null

  const errorStr = typeof error === 'string' ? error : JSON.stringify(error)
  const isStockError = /stock insuficiente|stock\s*=\s*0|disponible=0/i.test(errorStr)
  const stockMatch = errorStr.match(/para\s+'([^']+)'/)
  const hrefWa = `https://wa.me/${WHATSAPP}?text=${toWhatsAppMessage()}`
  const etiquetaWa = isStockError
    ? t('checkout.errorStock.consultarWa')
    : t('cart.orderWhatsapp')

  return (
    <div
      ref={errorBannerRef}
      className="space-y-3"
      role="alert"
    >
      <div className="rounded-[12px] border border-hc-danger/20 bg-hc-danger-bg px-[14px] py-3 text-[13px] leading-[18px] text-hc-danger">
        <p className="mb-1 font-semibold">{t('checkout.payError')}</p>
        {isStockError
          ? <ErrorStock productoBloqueado={stockMatch?.[1] ?? null} rutaCarrito={rutaCarrito} />
          : (
            <ErrorPago
              errorStr={errorStr}
              intentos={intentos}
              maxIntentos={maxIntentos}
              onPagar={onPagar}
              t={t}
            />
          )}
      </div>
      <WhatsAppAtajo href={hrefWa}>{etiquetaWa}</WhatsAppAtajo>
    </div>
  )
}
