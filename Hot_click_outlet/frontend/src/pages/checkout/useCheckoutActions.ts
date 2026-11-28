import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { ejecutarValidateDomicilio, ejecutarPagarCheckout } from './ejecutarPagarCheckout'
import { ejecutarSubirComprobante, ejecutarSinpeWhatsApp } from './ejecutarSubirComprobante'
import type { BodegaRetiro, ItemCheckout, PaqueteCheckout } from './checkoutHelpers'
import type { CheckoutPayload } from '@/types/pedido'
import type { Dispatch, SetStateAction } from 'react'

type PagoDataAcciones = {
  numeroPedido?: string
  proveedor?: string
}

type CheckoutActionsDeps = {
  token: string | null
  items: ItemCheckout[]
  totalFinal: number
  metodoEnvio: string
  metodoPago: string
  sinpeManualHabilitado?: boolean
  tarjetaOnvoHabilitada?: boolean
  notas: string
  telefono: string
  direccion: string
  direccionPedido?: string
  provincia?: string
  canton?: string
  guestEmail: string
  guestPhone: string
  sinpeNombre: string
  sinpeCedula: string
  sinpeTelefono: string
  sinpeTipoIdentificacion?: number
  sinpeEmail: string
  sinpeImagen: File | null
  pagoData: PagoDataAcciones | null
  aceptaDatos: boolean
  bodegaRetiro: BodegaRetiro | null
  paquetes: PaqueteCheckout[]
  metodoEnvioPorPaquete: Record<string, string>
  necesitaDireccion: boolean
  iniciarPago: (payload: CheckoutPayload, isGuest?: boolean, isSinpe?: boolean) => void
  validatePhone: (v: string) => string
  validateAddress: (v: string) => string
  validateGuestEmail: (v: string) => string
  setDireccionError: Dispatch<SetStateAction<string>>
  setDireccionDirty: Dispatch<SetStateAction<boolean>>
  setTelefonoError: Dispatch<SetStateAction<string>>
  setTelefonoDirty: Dispatch<SetStateAction<boolean>>
  setGuestEmailError: Dispatch<SetStateAction<string>>
  setGuestEmailDirty: Dispatch<SetStateAction<boolean>>
  setGuestPhoneError: Dispatch<SetStateAction<string>>
  setGuestPhoneDirty: Dispatch<SetStateAction<boolean>>
  setSinpeNombreErr: Dispatch<SetStateAction<string>>
  setSinpeCedulaErr: Dispatch<SetStateAction<string>>
  setSinpeImagenErr: Dispatch<SetStateAction<string>>
  setSinpeUploadEstado: Dispatch<SetStateAction<string>>
  setSinpeUploadError: Dispatch<SetStateAction<string>>
}

/**
 * Handlers de checkout — flujo bit-idéntico al original (pago, SINPE, cupón).
 */
export function useCheckoutActions(deps: CheckoutActionsDeps) {
  const {
    token,
    items,
    totalFinal,
    metodoEnvio,
    metodoPago,
    sinpeManualHabilitado,
    tarjetaOnvoHabilitada,
    notas,
    telefono,
    direccion,
    direccionPedido,
    provincia,
    canton,
    guestEmail,
    guestPhone,
    sinpeNombre,
    sinpeCedula,
    sinpeTelefono,
    sinpeTipoIdentificacion,
    sinpeEmail,
    sinpeImagen,
    pagoData,
    aceptaDatos,
    bodegaRetiro,
    paquetes,
    metodoEnvioPorPaquete,
    necesitaDireccion,
    iniciarPago,
    validatePhone,
    validateAddress,
    validateGuestEmail,
    setDireccionError,
    setDireccionDirty,
    setTelefonoError,
    setTelefonoDirty,
    setGuestEmailError,
    setGuestEmailDirty,
    setGuestPhoneError,
    setGuestPhoneDirty,
    setSinpeNombreErr,
    setSinpeCedulaErr,
    setSinpeImagenErr,
    setSinpeUploadEstado,
    setSinpeUploadError,
  } = deps

  const validateDomicilio = useCallback(() => {
    return ejecutarValidateDomicilio({
      necesitaDireccion, direccion, token, telefono,
      validateAddress, validatePhone,
      setDireccionError, setDireccionDirty, setTelefonoError, setTelefonoDirty,
    })
  }, [
    necesitaDireccion,
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

  const { t } = useTranslation()
  const { showToast } = useToast()
  const handlePagar = useCallback(() => {
    ejecutarPagarCheckout({
      aceptaDatos, validateDomicilio, token, validateGuestEmail, validatePhone, guestEmail,
      setGuestEmailError, setGuestEmailDirty, guestPhone, setGuestPhoneError, setGuestPhoneDirty,
      metodoPago, sinpeNombre, sinpeCedula,
      setSinpeNombreErr, setSinpeCedulaErr, telefono,
      metodoEnvio, paquetes, metodoEnvioPorPaquete, necesitaDireccion,
      notas, direccion, direccionPedido, provincia, canton, sinpeEmail, totalFinal, items, bodegaRetiro,
      sinpeTelefono, sinpeTipoIdentificacion, iniciarPago, sinpeManualHabilitado, tarjetaOnvoHabilitada,
      avisarSinMetodo: () => showToast(t('checkout.f.sinMetodoPago'), 'error'),
    })
  }, [
    aceptaDatos,
    validateDomicilio,
    token,
    validateGuestEmail,
    validatePhone,
    guestEmail,
    setGuestEmailError,
    setGuestEmailDirty,
    guestPhone,
    setGuestPhoneError,
    setGuestPhoneDirty,
    metodoPago,
    sinpeNombre,
    sinpeCedula,
    setSinpeNombreErr,
    setSinpeCedulaErr,
    telefono,
    metodoEnvio,
    paquetes,
    metodoEnvioPorPaquete,
    necesitaDireccion,
    notas,
    direccion,
    direccionPedido,
    provincia,
    canton,
    sinpeEmail,
    totalFinal,
    items,
    bodegaRetiro,
    sinpeTelefono,
    sinpeTipoIdentificacion,
    iniciarPago,
    sinpeManualHabilitado,
    tarjetaOnvoHabilitada,
    showToast,
    t,
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

  return {
    validateDomicilio,
    handlePagar,
    handleSinpeWhatsApp,
    handleSubirComprobante,
  }
}
