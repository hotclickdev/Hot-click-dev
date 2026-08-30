import type { RefObject } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CheckoutStepper from '@/components/ui/CheckoutStepper'
import TextoFlecha from '@/components/ui/TextoFlecha'
import CheckoutForm from './CheckoutForm'
import CheckoutSummary from './CheckoutSummary'
import CheckoutChrome from './CheckoutChrome'
import {
  hrefCarritoCheckout,
  usaSkinVisitanteCheckout,
} from './checkoutVisitanteSkin'
import type { CheckoutFormState } from './useCheckoutForm'
import type { ItemCheckout } from './checkoutHelpers'

type CheckoutLayoutProps = {
  token: string | null
  items: ItemCheckout[]
  form: CheckoutFormState
  estado: string
  error: unknown
  intentos: number
  maxIntentos: number
  errorBannerRef: RefObject<HTMLDivElement | null>
  toWhatsAppMessage: () => string
  validarGiftCard: () => void
  validarCupon: () => void
  onPagar: () => void
  onWhatsApp: () => void
}

/**
 * Shell de la página de checkout: stepper, título, formulario y resumen.
 * En Visitante (~375) omite MainLayout y aplica jerarquía Figma.
 */
export default function CheckoutLayout({
  token,
  items,
  form,
  estado,
  error,
  intentos,
  maxIntentos,
  errorBannerRef,
  toWhatsAppMessage,
  validarGiftCard,
  validarCupon,
  onPagar,
  onWhatsApp,
}: CheckoutLayoutProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const skinVisitante = usaSkinVisitanteCheckout(pathname)
  const linkCarrito = hrefCarritoCheckout(skinVisitante)
  const {
    metodoPago,
    gcInput,
    setGcInput,
    gcEstado,
    setGcEstado,
    setGcSaldo,
    setGcCodigo,
    gcSaldo,
    gcCodigo,
    cuponInput,
    setCuponInput,
    cuponEstado,
    setCuponEstado,
    setCuponDescuento,
    setCuponCodigo,
    setCuponError,
    cuponDescuento,
    cuponError,
    subtotalCart,
    descuentoMonto,
    gcAplicado,
    costoEnvio,
    totalFinal,
    aceptaDatos,
    setAceptaDatos,
  } = form

  const body = (
    <div
      className={
        skinVisitante
          ? 'mx-auto max-w-md px-5 pb-10 pt-5'
          : 'mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-8'
      }
    >
      {!skinVisitante ? <CheckoutStepper activeStep="checkout" /> : null}
      <div className={skinVisitante ? 'mb-4' : 'mb-4 sm:mb-6'}>
        <Link
          to={linkCarrito}
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--hc-link)' }}
        >
          <TextoFlecha dir="atras">{t('checkout.backToCart')}</TextoFlecha>
        </Link>
        <h1
          className={
            skinVisitante
              ? 'mt-3 font-display text-2xl font-bold text-hc-text'
              : 'mt-2 text-2xl font-bold sm:text-3xl'
          }
          style={skinVisitante ? undefined : { color: 'var(--hc-text)' }}
        >
          {t('checkout.title')}
        </h1>
      </div>
      <div
        className={
          skinVisitante
            ? 'flex flex-col gap-4'
            : 'grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3'
        }
      >
        <CheckoutForm
          token={token}
          form={form}
          estado={estado}
          error={error}
          intentos={intentos}
          maxIntentos={maxIntentos}
          toWhatsAppMessage={toWhatsAppMessage}
          errorBannerRef={errorBannerRef}
          onPagar={onPagar}
          onWhatsApp={onWhatsApp}
          rutaCarrito={linkCarrito}
        />
        <div className={skinVisitante ? undefined : 'lg:col-span-1'}>
          <CheckoutSummary
            items={items}
            token={token}
            gcInput={gcInput}
            setGcInput={setGcInput}
            gcEstado={gcEstado}
            setGcEstado={setGcEstado}
            setGcSaldo={setGcSaldo}
            setGcCodigo={setGcCodigo}
            gcSaldo={gcSaldo}
            gcCodigo={gcCodigo}
            validarGiftCard={validarGiftCard}
            cuponInput={cuponInput}
            setCuponInput={setCuponInput}
            cuponEstado={cuponEstado}
            setCuponEstado={setCuponEstado}
            setCuponDescuento={setCuponDescuento}
            setCuponCodigo={setCuponCodigo}
            setCuponError={setCuponError}
            cuponDescuento={cuponDescuento}
            cuponError={cuponError}
            validarCupon={validarCupon}
            subtotalCart={subtotalCart}
            descuentoMonto={descuentoMonto}
            gcAplicado={gcAplicado}
            costoEnvio={costoEnvio}
            totalFinal={totalFinal}
            metodoPago={metodoPago}
            aceptaDatos={aceptaDatos}
            setAceptaDatos={setAceptaDatos}
            estado={estado}
            intentos={intentos}
            maxIntentos={maxIntentos}
            onPagar={onPagar}
          />
        </div>
      </div>
    </div>
  )

  return <CheckoutChrome embedido={skinVisitante}>{body}</CheckoutChrome>
}
