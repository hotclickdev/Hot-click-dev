import { useCallback } from 'react'
import { ejecutarValidarGiftCard } from './ejecutarValidarGiftCard'
import { ejecutarValidarCupon } from './ejecutarValidarCupon'
import { ejecutarValidateDomicilio, ejecutarPagarCheckout } from './ejecutarPagarCheckout'
import { ejecutarSubirComprobante, ejecutarSinpeWhatsApp, ejecutarCheckoutWhatsApp } from './ejecutarSubirComprobante'

/**
 * Handlers de checkout — flujo bit-idéntico al original (pago, SINPE, cupón, gift card).
 * @param {object} deps
 */
export function useCheckoutActions(deps) {
  const {
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
  } = deps

  const validarGiftCard = useCallback(async () => {
    await ejecutarValidarGiftCard({ gcInput, token, setGcEstado, setGcSaldo, setGcCodigo })
  }, [gcInput, token, setGcEstado, setGcSaldo, setGcCodigo])

  const validarCupon = useCallback(async () => {
    await ejecutarValidarCupon({ cuponInput, setCuponEstado, setCuponError, setCuponDescuento, setCuponCodigo })
  }, [cuponInput, setCuponEstado, setCuponError, setCuponDescuento, setCuponCodigo])

  const validateDomicilio = useCallback(() => {
    return ejecutarValidateDomicilio({
      SHIPPING_OPTIONS, metodoEnvio, direccion, token, telefono,
      validateAddress, validatePhone,
      setDireccionError, setDireccionDirty, setTelefonoError, setTelefonoDirty,
    })
  }, [
    SHIPPING_OPTIONS,
    metodoEnvio,
    direccion,
    token,
    telefono,
    validateAddress,
    validatePhone,
    setDireccionError,
    setDireccionDirty,
    setTelefonoError,
    setTelefonoDirty,
  ])

  const handlePagar = useCallback(() => {
    ejecutarPagarCheckout({
      aceptaDatos, validateDomicilio, token, validateGuestEmail, guestEmail,
      setGuestEmailError, setGuestEmailDirty, metodoPago, sinpeNombre, sinpeCedula,
      setSinpeNombreErr, setSinpeCedulaErr, telefono, guestPhone, SHIPPING_OPTIONS,
      metodoEnvio, notas, direccion, sinpeEmail, totalFinal, items, bodegaRetiro,
      cuponCodigo, gcCodigo, sinpeTelefono, iniciarPago,
    })
  }, [
    aceptaDatos,
    validateDomicilio,
    token,
    validateGuestEmail,
    guestEmail,
    setGuestEmailError,
    setGuestEmailDirty,
    metodoPago,
    sinpeNombre,
    sinpeCedula,
    setSinpeNombreErr,
    setSinpeCedulaErr,
    telefono,
    guestPhone,
    SHIPPING_OPTIONS,
    metodoEnvio,
    notas,
    direccion,
    sinpeEmail,
    totalFinal,
    items,
    bodegaRetiro,
    cuponCodigo,
    gcCodigo,
    sinpeTelefono,
    iniciarPago,
  ])

  const handleSinpeWhatsApp = useCallback(() => {
    ejecutarSinpeWhatsApp({ pagoData, sinpeNombre, sinpeCedula, sinpeTelefono, totalFinal })
  }, [pagoData, sinpeNombre, sinpeCedula, sinpeTelefono, totalFinal])

  const handleSubirComprobante = useCallback(async () => {
    await ejecutarSubirComprobante({
      sinpeImagen, sinpeNombre, sinpeCedula, sinpeTelefono, pagoData,
      token, sinpeEmail, guestEmail,
      setSinpeImagenErr, setSinpeUploadEstado, setSinpeUploadError,
    })
  }, [
    sinpeImagen,
    sinpeNombre,
    sinpeCedula,
    sinpeTelefono,
    pagoData,
    token,
    sinpeEmail,
    guestEmail,
    setSinpeImagenErr,
    setSinpeUploadEstado,
    setSinpeUploadError,
  ])

  const handleWhatsApp = useCallback(() => {
    ejecutarCheckoutWhatsApp({ totalFinal, items, toWhatsAppMessage })
  }, [totalFinal, items, toWhatsAppMessage])

  return {
    validarGiftCard,
    validarCupon,
    validateDomicilio,
    handlePagar,
    handleSinpeWhatsApp,
    handleSubirComprobante,
    handleWhatsApp,
  }
}
