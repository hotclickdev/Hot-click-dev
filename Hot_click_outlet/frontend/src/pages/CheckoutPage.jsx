import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import CheckoutStepper from '@/components/ui/CheckoutStepper'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { usePayment } from '@/hooks/usePayment'
import CheckoutEmpty from './checkout/CheckoutEmpty'
import CheckoutLoading from './checkout/CheckoutLoading'
import CheckoutNotes from './checkout/CheckoutNotes'
import CheckoutPaidGiftCard from './checkout/CheckoutPaidGiftCard'
import CheckoutPayError from './checkout/CheckoutPayError'
import CheckoutSinpePending from './checkout/CheckoutSinpePending'
import CheckoutSummary from './checkout/CheckoutSummary'
import ExpressCheckout from './checkout/ExpressCheckout'
import GuestContactSection from './checkout/GuestContactSection'
import PaymentMethods from './checkout/PaymentMethods'
import ShippingSection from './checkout/ShippingSection'
import {
  SHIPPING_COSTS,
  bodegaRetiroDesdeItems,
  opcionesEnvio,
  validateAddress as mensajeDireccion,
  validateGuestEmail as mensajeEmailInvitado,
  validatePhone as mensajeTelefono,
} from './checkout/checkoutHelpers'
import { useCheckoutActions } from './checkout/useCheckoutActions'

export default function CheckoutPage() {
  const { items, total, toWhatsAppMessage } = useCartStore()
  const { token } = useAuthStore()
  const { estado, pagoData, error, intentos, maxIntentos, iniciarPago } = usePayment()
  const errorBannerRef = useRef(null)
  const { t } = useTranslation()

  const bodegaRetiro = bodegaRetiroDesdeItems(items)
  const SHIPPING_OPTIONS = opcionesEnvio(bodegaRetiro)

  const [metodoEnvio, setMetodoEnvio] = useState(bodegaRetiro ? 'RETIRO_EN_TIENDA' : 'ENVIO_NORMAL_GAM')
  const [metodoPago, setMetodoPago] = useState('SINPE')

  useEffect(() => {
    if (!SHIPPING_OPTIONS.some((o) => o.value === metodoEnvio)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMetodoEnvio(SHIPPING_OPTIONS[0]?.value ?? 'ENVIO_NORMAL_GAM')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  function validatePhone(v) {
    return mensajeTelefono(v, t)
  }
  function validateAddress(v) {
    return mensajeDireccion(v, t)
  }
  function validateGuestEmail(v) {
    return mensajeEmailInvitado(v, t)
  }

  const [notas, setNotas] = useState('')

  const [sinpeNombre, setSinpeNombre] = useState('')
  const [sinpeCedula, setSinpeCedula] = useState('')
  const [sinpeTelefono, setSinpeTelefono] = useState('')
  const [sinpeEmail, setSinpeEmail] = useState('')
  const [sinpeNombreErr, setSinpeNombreErr] = useState('')
  const [sinpeCedulaErr, setSinpeCedulaErr] = useState('')

  const [sinpeImagen, setSinpeImagen] = useState(null)
  const [sinpeImagenErr, setSinpeImagenErr] = useState('')
  const [sinpeUploadEstado, setSinpeUploadEstado] = useState('idle')
  const [sinpeUploadError, setSinpeUploadError] = useState('')
  const sinpeInputRef = useRef(null)

  const [telefono, setTelefono] = useState('')
  const [telefonoError, setTelefonoError] = useState('')
  const [telefonoDirty, setTelefonoDirty] = useState(false)
  const [direccion, setDireccion] = useState('')
  const [direccionError, setDireccionError] = useState('')
  const [direccionDirty, setDireccionDirty] = useState(false)

  const [guestEmail, setGuestEmail] = useState('')
  const [guestEmailError, setGuestEmailError] = useState('')
  const [guestEmailDirty, setGuestEmailDirty] = useState(false)
  const [guestPhone, setGuestPhone] = useState('')

  const [cuponInput, setCuponInput] = useState('')
  const [cuponEstado, setCuponEstado] = useState('idle')
  const [cuponDescuento, setCuponDescuento] = useState(0)
  const [cuponCodigo, setCuponCodigo] = useState(null)
  const [cuponError, setCuponError] = useState('')

  const [gcInput, setGcInput] = useState('')
  const [gcEstado, setGcEstado] = useState('idle')
  const [gcSaldo, setGcSaldo] = useState(0)
  const [gcCodigo, setGcCodigo] = useState(null)
  const [aceptaDatos, setAceptaDatos] = useState(false)

  const { clearCart: clearCartFn } = useCartStore()
  useEffect(() => {
    if (estado === 'gift_card_paid' || estado === 'sinpe_pendiente') clearCartFn()
  }, [estado, clearCartFn])

  useEffect(() => {
    globalThis.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    if (estado === 'sinpe_pendiente' || estado === 'gift_card_paid') {
      globalThis.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (estado === 'failed') {
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [estado])

  const costoEnvio = SHIPPING_COSTS[metodoEnvio] ?? 0
  const subtotalCart = total()
  const descuentoMonto = cuponDescuento > 0 ? Math.round(subtotalCart * cuponDescuento / 100) : 0
  const baseConCupon = subtotalCart - descuentoMonto + costoEnvio
  const gcAplicado = gcSaldo > 0 ? Math.min(gcSaldo, baseConCupon) : 0
  const totalFinal = baseConCupon - gcAplicado

  const {
    validarGiftCard,
    validarCupon,
    handlePagar,
    handleSinpeWhatsApp,
    handleSubirComprobante,
    handleWhatsApp,
  } = useCheckoutActions({
    token,
    items,
    totalFinal,
    metodoEnvio,
    metodoPago,
    notas,
    telefono,
    direccion,
    guestEmail,
    guestPhone,
    sinpeNombre,
    sinpeCedula,
    sinpeTelefono,
    sinpeEmail,
    sinpeImagen,
    pagoData,
    aceptaDatos,
    bodegaRetiro,
    cuponCodigo,
    gcCodigo,
    gcInput,
    cuponInput,
    SHIPPING_OPTIONS,
    iniciarPago,
    toWhatsAppMessage,
    validatePhone,
    validateAddress,
    validateGuestEmail,
    setGcEstado,
    setGcSaldo,
    setGcCodigo,
    setCuponEstado,
    setCuponError,
    setCuponDescuento,
    setCuponCodigo,
    setDireccionError,
    setDireccionDirty,
    setTelefonoError,
    setTelefonoDirty,
    setGuestEmailError,
    setGuestEmailDirty,
    setSinpeNombreErr,
    setSinpeCedulaErr,
    setSinpeImagenErr,
    setSinpeUploadEstado,
    setSinpeUploadError,
  })

  if (items.length === 0) return <CheckoutEmpty />

  if (estado === 'sinpe_pendiente') {
    return (
      <CheckoutSinpePending
        pagoData={pagoData}
        totalFinal={totalFinal}
        sinpeNombre={sinpeNombre}
        sinpeCedula={sinpeCedula}
        sinpeTelefono={sinpeTelefono}
        sinpeImagen={sinpeImagen}
        setSinpeImagen={setSinpeImagen}
        sinpeImagenErr={sinpeImagenErr}
        setSinpeImagenErr={setSinpeImagenErr}
        sinpeUploadEstado={sinpeUploadEstado}
        setSinpeUploadEstado={setSinpeUploadEstado}
        sinpeUploadError={sinpeUploadError}
        setSinpeUploadError={setSinpeUploadError}
        sinpeInputRef={sinpeInputRef}
        onSubirComprobante={handleSubirComprobante}
        onSinpeWhatsApp={handleSinpeWhatsApp}
      />
    )
  }

  if (estado === 'gift_card_paid') return <CheckoutPaidGiftCard pagoData={pagoData} />

  if (estado === 'redirecting' || estado === 'loading') {
    return <CheckoutLoading estado={estado} />
  }

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
          <div className="lg:col-span-2 space-y-3 sm:space-y-6">
            {!token && (
              <GuestContactSection
                guestEmail={guestEmail}
                setGuestEmail={setGuestEmail}
                guestEmailError={guestEmailError}
                setGuestEmailError={setGuestEmailError}
                guestEmailDirty={guestEmailDirty}
                setGuestEmailDirty={setGuestEmailDirty}
                guestPhone={guestPhone}
                setGuestPhone={setGuestPhone}
              />
            )}

            <ExpressCheckout onWhatsApp={handleWhatsApp} />

            <ShippingSection
              opciones={SHIPPING_OPTIONS}
              metodoEnvio={metodoEnvio}
              setMetodoEnvio={setMetodoEnvio}
              metodoPago={metodoPago}
              setMetodoPago={setMetodoPago}
              token={token}
              telefono={telefono}
              setTelefono={setTelefono}
              telefonoError={telefonoError}
              setTelefonoError={setTelefonoError}
              telefonoDirty={telefonoDirty}
              direccion={direccion}
              setDireccion={setDireccion}
              direccionError={direccionError}
              setDireccionError={setDireccionError}
              direccionDirty={direccionDirty}
              setDireccionDirty={setDireccionDirty}
            />

            <PaymentMethods
              metodoEnvio={metodoEnvio}
              metodoPago={metodoPago}
              setMetodoPago={setMetodoPago}
              token={token}
              sinpeNombre={sinpeNombre}
              setSinpeNombre={setSinpeNombre}
              sinpeNombreErr={sinpeNombreErr}
              setSinpeNombreErr={setSinpeNombreErr}
              sinpeCedula={sinpeCedula}
              setSinpeCedula={setSinpeCedula}
              sinpeCedulaErr={sinpeCedulaErr}
              setSinpeCedulaErr={setSinpeCedulaErr}
              sinpeTelefono={sinpeTelefono}
              setSinpeTelefono={setSinpeTelefono}
              sinpeEmail={sinpeEmail}
              setSinpeEmail={setSinpeEmail}
            />

            <CheckoutNotes notas={notas} setNotas={setNotas} />

            <CheckoutPayError
              estado={estado}
              error={error}
              intentos={intentos}
              maxIntentos={maxIntentos}
              onPagar={handlePagar}
              toWhatsAppMessage={toWhatsAppMessage}
              errorBannerRef={errorBannerRef}
            />
          </div>

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
              onPagar={handlePagar}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
