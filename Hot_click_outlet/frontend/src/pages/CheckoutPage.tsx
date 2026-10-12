import { useRef, useEffect } from 'react'
import { borrarBorrador } from '@/pages/checkout/borradorCheckout'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { usePayment, tilopayCardDesdePago } from '@/hooks/usePayment'
import CheckoutEmpty from './checkout/CheckoutEmpty'
import CheckoutLoading from './checkout/CheckoutLoading'
import CheckoutPaidGiftCard from './checkout/CheckoutPaidGiftCard'
import CheckoutEfectivoPendiente from './checkout/CheckoutEfectivoPendiente'
import CheckoutTilopayCard from './checkout/CheckoutTilopayCard'
import CheckoutLayout from './checkout/CheckoutLayout'
import { useCheckoutForm } from './checkout/useCheckoutForm'
import { useCheckoutActions } from './checkout/useCheckoutActions'
import { notasConEncomienda } from './checkout/checkoutHelpers'

/**
 * Checkout de producción: mismos side effects de pago; layout TypeScript Figma.
 * Bajo `/visitante/*` omite MainLayout (skin vía pathname en subvistas).
 */
export default function CheckoutPage() {
  const { items, total, toWhatsAppMessage } = useCartStore()
  const { token } = useAuthStore()
  const { estado, pagoData, error, errorCodigo, intentos, maxIntentos, iniciarPago, reset } = usePayment()
  const errorBannerRef = useRef<HTMLDivElement | null>(null)

  const form = useCheckoutForm({ items, total })

  const { clearCart: clearCartFn } = useCartStore()
  useEffect(() => {
    if (estado === 'gift_card_paid' || estado === 'pedido_manual') { clearCartFn(); borrarBorrador() }
  }, [estado, clearCartFn])

  useEffect(() => {
    globalThis.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    if (estado === 'pedido_manual' || estado === 'gift_card_paid' || estado === 'tilopay_card') {
      globalThis.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (estado === 'failed') {
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [estado])

  const { handlePagar } = useCheckoutActions({
    token,
    items,
    totalFinal: form.totalFinal,
    metodoEnvio: form.metodoEnvio,
    metodoPago: form.metodoPago,
    notas: notasConEncomienda(form.notas, form.paquetes, form.metodoEnvioPorPaquete, form.encomiendaPorPaquete),
    telefono: form.telefono,
    direccion: form.direccion,
    direccionPedido: form.direccionPedido,
    guestEmail: form.guestEmail,
    guestPhone: form.guestPhone,
    nombreComprador: form.nombreComprador,
    aceptaDatos: form.aceptaDatos,
    bodegaRetiro: form.bodegaRetiro,
    cuponCodigo: form.cuponCodigo,
    gcCodigo: form.gcCodigo,
    gcInput: form.gcInput,
    cuponInput: form.cuponInput,
    paquetes: form.paquetes,
    metodoEnvioPorPaquete: form.metodoEnvioPorPaquete,
    necesitaDireccion: form.necesitaDireccion,
    iniciarPago,
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
    setNombreCompradorErr: form.setNombreCompradorErr,
  })

  if (estado === 'tilopay_card') {
    const payload = tilopayCardDesdePago(pagoData)
    if (payload) {
      return <CheckoutTilopayCard payload={payload} onVolver={reset} />
    }
  }

  if (estado === 'pedido_manual') {
    return (
      <CheckoutEfectivoPendiente
        pagoData={pagoData}
        totalFinal={Number(form.totalFinal) || Number(pagoData?.total) || 0}
        nombreComprador={form.nombreComprador}
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
      errorCodigo={errorCodigo}
      intentos={intentos}
      maxIntentos={maxIntentos}
      errorBannerRef={errorBannerRef}
      toWhatsAppMessage={toWhatsAppMessage}
      onPagar={handlePagar}
    />
  )
}
