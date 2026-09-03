import { useRef, useEffect } from 'react'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { usePayment } from '@/hooks/usePayment'
import CheckoutEmpty from './checkout/CheckoutEmpty'
import CheckoutLoading from './checkout/CheckoutLoading'
import CheckoutPaidGiftCard from './checkout/CheckoutPaidGiftCard'
import CheckoutSinpePending from './checkout/CheckoutSinpePending'
import CheckoutLayout from './checkout/CheckoutLayout'
import { useCheckoutForm } from './checkout/useCheckoutForm'
import { useCheckoutActions } from './checkout/useCheckoutActions'

/**
 * Checkout de producción: mismos side effects de pago; layout TypeScript Figma.
 * Bajo `/visitante/*` omite MainLayout (skin vía pathname en subvistas).
 */
export default function CheckoutPage() {
  const { items, total, toWhatsAppMessage } = useCartStore()
  const { token } = useAuthStore()
  const { estado, pagoData, error, intentos, maxIntentos, iniciarPago } = usePayment()
  const errorBannerRef = useRef<HTMLDivElement | null>(null)

  const form = useCheckoutForm({ items, total })

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
    totalFinal: form.totalFinal,
    metodoEnvio: form.metodoEnvio,
    metodoPago: form.metodoPago,
    notas: form.notas,
    telefono: form.telefono,
    direccion: form.direccion,
    guestEmail: form.guestEmail,
    guestPhone: form.guestPhone,
    sinpeNombre: form.sinpeNombre,
    sinpeCedula: form.sinpeCedula,
    sinpeTelefono: form.sinpeTelefono,
    sinpeEmail: form.sinpeEmail,
    sinpeImagen: form.sinpeImagen,
    pagoData,
    aceptaDatos: form.aceptaDatos,
    bodegaRetiro: form.bodegaRetiro,
    cuponCodigo: form.cuponCodigo,
    gcCodigo: form.gcCodigo,
    gcInput: form.gcInput,
    cuponInput: form.cuponInput,
    SHIPPING_OPTIONS: form.SHIPPING_OPTIONS,
    iniciarPago,
    toWhatsAppMessage,
    validatePhone: form.validatePhone,
    validateAddress: form.validateAddress,
    validateGuestEmail: form.validateGuestEmail,
    setGcEstado: form.setGcEstado,
    setGcSaldo: form.setGcSaldo,
    setGcCodigo: form.setGcCodigo,
    setCuponEstado: form.setCuponEstado,
    setCuponError: form.setCuponError,
    setCuponDescuento: form.setCuponDescuento,
    setCuponCodigo: form.setCuponCodigo,
    setDireccionError: form.setDireccionError,
    setDireccionDirty: form.setDireccionDirty,
    setTelefonoError: form.setTelefonoError,
    setTelefonoDirty: form.setTelefonoDirty,
    setGuestEmailError: form.setGuestEmailError,
    setGuestEmailDirty: form.setGuestEmailDirty,
    setGuestPhoneError: form.setGuestPhoneError,
    setGuestPhoneDirty: form.setGuestPhoneDirty,
    setSinpeNombreErr: form.setSinpeNombreErr,
    setSinpeCedulaErr: form.setSinpeCedulaErr,
    setSinpeImagenErr: form.setSinpeImagenErr,
    setSinpeUploadEstado: form.setSinpeUploadEstado,
    setSinpeUploadError: form.setSinpeUploadError,
  })

  if (estado === 'sinpe_pendiente') {
    return (
      <CheckoutSinpePending
        pagoData={pagoData}
        totalFinal={Number(form.totalFinal) || Number(pagoData?.total) || 0}
        sinpeNombre={form.sinpeNombre}
        sinpeCedula={form.sinpeCedula}
        sinpeTelefono={form.sinpeTelefono}
        sinpeImagen={form.sinpeImagen}
        setSinpeImagen={form.setSinpeImagen}
        sinpeImagenErr={form.sinpeImagenErr}
        setSinpeImagenErr={form.setSinpeImagenErr}
        sinpeUploadEstado={form.sinpeUploadEstado}
        setSinpeUploadEstado={form.setSinpeUploadEstado}
        sinpeUploadError={form.sinpeUploadError}
        setSinpeUploadError={form.setSinpeUploadError}
        sinpeInputRef={form.sinpeInputRef}
        onSubirComprobante={handleSubirComprobante}
        onSinpeWhatsApp={handleSinpeWhatsApp}
      />
    )
  }

  if (estado === 'gift_card_paid') return <CheckoutPaidGiftCard pagoData={pagoData} />

  if (estado === 'redirecting' || estado === 'loading') {
    return <CheckoutLoading estado={estado} />
  }

  if (items.length === 0) return <CheckoutEmpty />

  return (
    <CheckoutLayout
      token={token}
      items={items}
      form={form}
      estado={estado}
      error={error}
      intentos={intentos}
      maxIntentos={maxIntentos}
      errorBannerRef={errorBannerRef}
      toWhatsAppMessage={toWhatsAppMessage}
      validarGiftCard={validarGiftCard}
      validarCupon={validarCupon}
      onPagar={handlePagar}
      onWhatsApp={handleWhatsApp}
    />
  )
}
