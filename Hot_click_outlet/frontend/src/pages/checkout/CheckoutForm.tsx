import CheckoutNotes from './CheckoutNotes'
import CheckoutPayError from './CheckoutPayError'
import ExpressCheckout from './ExpressCheckout'
import GuestContactSection from './GuestContactSection'
import PaymentMethods from './PaymentMethods'
import ShippingSection from './ShippingSection'
import type { CheckoutFormState } from './useCheckoutForm'
import type { RefObject } from 'react'

type CheckoutFormProps = {
  token: string | null
  form: CheckoutFormState
  estado: string
  error: unknown
  intentos: number
  maxIntentos: number
  toWhatsAppMessage: () => string
  errorBannerRef: RefObject<HTMLDivElement | null>
  onPagar: () => void
  onWhatsApp: () => void
}

/**
 * Formulario de contacto, envío, pago y notas (columna izquierda).
 */
export default function CheckoutForm({
  token,
  form,
  estado,
  error,
  intentos,
  maxIntentos,
  toWhatsAppMessage,
  errorBannerRef,
  onPagar,
  onWhatsApp,
}: CheckoutFormProps) {
  const {
    SHIPPING_OPTIONS,
    metodoEnvio,
    setMetodoEnvio,
    metodoPago,
    setMetodoPago,
    notas,
    setNotas,
    sinpeNombre,
    setSinpeNombre,
    sinpeCedula,
    setSinpeCedula,
    sinpeTelefono,
    setSinpeTelefono,
    sinpeEmail,
    setSinpeEmail,
    sinpeNombreErr,
    setSinpeNombreErr,
    sinpeCedulaErr,
    setSinpeCedulaErr,
    telefono,
    setTelefono,
    telefonoError,
    setTelefonoError,
    telefonoDirty,
    direccion,
    setDireccion,
    direccionError,
    setDireccionError,
    direccionDirty,
    setDireccionDirty,
    guestEmail,
    setGuestEmail,
    guestEmailError,
    setGuestEmailError,
    guestEmailDirty,
    setGuestEmailDirty,
    guestPhone,
    setGuestPhone,
  } = form

  return (
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

      <ExpressCheckout onWhatsApp={onWhatsApp} />

      <CheckoutNotes notas={notas} setNotas={setNotas} />

      <CheckoutPayError
        estado={estado}
        error={error}
        intentos={intentos}
        maxIntentos={maxIntentos}
        onPagar={onPagar}
        toWhatsAppMessage={toWhatsAppMessage}
        errorBannerRef={errorBannerRef}
      />
    </div>
  )
}
