import { useCallback } from 'react'
import { ejecutarValidarGiftCard } from './ejecutarValidarGiftCard'
import { ejecutarValidarCupon } from './ejecutarValidarCupon'
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
  notas: string
  telefono: string
  direccion: string
  direccionPedido?: string
  guestEmail: string
  guestPhone: string
  sinpeNombre: string
  sinpeCedula: string
  sinpeTelefono: string
  sinpeEmail: string
  sinpeImagen: File | null
  pagoData: PagoDataAcciones | null
  aceptaDatos: boolean
  bodegaRetiro: BodegaRetiro | null
  cuponCodigo: string | null
  gcCodigo: string | null
  gcInput: string
  cuponInput: string
  paquetes: PaqueteCheckout[]
  metodoEnvioPorPaquete: Record<string, string>
  necesitaDireccion: boolean
  iniciarPago: (payload: CheckoutPayload, isGuest?: boolean, isSinpe?: boolean) => void
  validatePhone: (v: string) => string
  validateAddress: (v: string) => string
  validateGuestEmail: (v: string) => string
  setGcEstado: (value: string) => void
  setGcSaldo: (value: number) => void
  setGcCodigo: (value: string | null) => void
  setCuponEstado: (value: string) => void
  setCuponError: (value: string) => void
  setCuponDescuento: (value: number) => void
  setCuponCodigo: (value: string | null) => void
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
 * Handlers de checkout — flujo bit-idéntico al original (pago, SINPE, cupón, gift card).
 */
export function useCheckoutActions(deps: CheckoutActionsDeps) {
  const {
    token,
    items,
    totalFinal,
    metodoEnvio,
    metodoPago,
    notas,
    telefono,
    direccion,
    direccionPedido,
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
    paquetes,
    metodoEnvioPorPaquete,
    necesitaDireccion,
    iniciarPago,
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
    setGuestPhoneError,
    setGuestPhoneDirty,
    setSinpeNombreErr,
    setSinpeCedulaErr,
    setSinpeImagenErr,
    setSinpeUploadEstado,
    setSinpeUploadError,
  } = deps

  const validarGiftCard = useCallback(async () => {
    await ejecutarValidarGiftCard({
      gcInput,
      token,
      setGcEstado,
      setGiftCard: (gift) => {
        setGcSaldo(gift?.saldo ?? 0)
        setGcCodigo(gift?.codigo ?? '')
      },
    })
  }, [gcInput, token, setGcEstado, setGcSaldo, setGcCodigo])

  const validarCupon = useCallback(async () => {
    await ejecutarValidarCupon({ cuponInput, setCuponEstado, setCuponError, setCuponDescuento, setCuponCodigo })
  }, [cuponInput, setCuponEstado, setCuponError, setCuponDescuento, setCuponCodigo])

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

  const handlePagar = useCallback(() => {
    ejecutarPagarCheckout({
      aceptaDatos, validateDomicilio, token, validateGuestEmail, validatePhone, guestEmail,
      setGuestEmailError, setGuestEmailDirty, guestPhone, setGuestPhoneError, setGuestPhoneDirty,
      metodoPago, sinpeNombre, sinpeCedula,
      setSinpeNombreErr, setSinpeCedulaErr, telefono,
      metodoEnvio, paquetes, metodoEnvioPorPaquete, necesitaDireccion,
      notas, direccion, direccionPedido, sinpeEmail, totalFinal, items, bodegaRetiro,
      cuponCodigo, gcCodigo, sinpeTelefono, iniciarPago,
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

  return {
    validarGiftCard,
    validarCupon,
    validateDomicilio,
    handlePagar,
    handleSinpeWhatsApp,
    handleSubirComprobante,
  }
}
