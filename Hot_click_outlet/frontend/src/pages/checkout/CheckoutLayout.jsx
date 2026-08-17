import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import CheckoutStepper from '@/components/ui/CheckoutStepper'
import CheckoutForm from './CheckoutForm'
import CheckoutSummary from './CheckoutSummary'

/**
 * Shell de la página de checkout: stepper, título, formulario y resumen.
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
}) {
  const { t } = useTranslation()
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

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <CheckoutStepper activeStep="checkout" />

        <div className="mb-4 sm:mb-6">
          <Link to="/carrito" className="text-sm transition-colors hover:text-[#4f7cff]" style={{ color: 'var(--hc-muted)' }}>
            ← {t('checkout.backToCart')}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2" style={{ color: 'var(--hc-text)' }}>{t('checkout.title')}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
          />

          <div className="lg:col-span-1">
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
    </MainLayout>
  )
}
