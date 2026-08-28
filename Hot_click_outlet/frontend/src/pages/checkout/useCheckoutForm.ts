import { useState, useRef, useEffect, type Dispatch, type SetStateAction, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  SHIPPING_COSTS,
  bodegaRetiroDesdeItems,
  opcionesEnvio,
  validateAddress as mensajeDireccion,
  validateGuestEmail as mensajeEmailInvitado,
  validatePhone as mensajeTelefono,
} from './checkoutHelpers'
import type { BodegaRetiro, ItemCheckout, OpcionEnvio } from './checkoutHelpers'

type UseCheckoutFormParams = {
  items: ItemCheckout[]
  total: () => number
}

export type CheckoutFormState = {
  bodegaRetiro: BodegaRetiro | null
  SHIPPING_OPTIONS: OpcionEnvio[]
  metodoEnvio: string
  setMetodoEnvio: Dispatch<SetStateAction<string>>
  metodoPago: string
  setMetodoPago: Dispatch<SetStateAction<string>>
  notas: string
  setNotas: Dispatch<SetStateAction<string>>
  sinpeNombre: string
  setSinpeNombre: Dispatch<SetStateAction<string>>
  sinpeCedula: string
  setSinpeCedula: Dispatch<SetStateAction<string>>
  sinpeTelefono: string
  setSinpeTelefono: Dispatch<SetStateAction<string>>
  sinpeEmail: string
  setSinpeEmail: Dispatch<SetStateAction<string>>
  sinpeNombreErr: string
  setSinpeNombreErr: Dispatch<SetStateAction<string>>
  sinpeCedulaErr: string
  setSinpeCedulaErr: Dispatch<SetStateAction<string>>
  sinpeImagen: File | null
  setSinpeImagen: Dispatch<SetStateAction<File | null>>
  sinpeImagenErr: string
  setSinpeImagenErr: Dispatch<SetStateAction<string>>
  sinpeUploadEstado: string
  setSinpeUploadEstado: Dispatch<SetStateAction<string>>
  sinpeUploadError: string
  setSinpeUploadError: Dispatch<SetStateAction<string>>
  sinpeInputRef: RefObject<HTMLInputElement | null>
  telefono: string
  setTelefono: Dispatch<SetStateAction<string>>
  telefonoError: string
  setTelefonoError: Dispatch<SetStateAction<string>>
  telefonoDirty: boolean
  setTelefonoDirty: Dispatch<SetStateAction<boolean>>
  direccion: string
  setDireccion: Dispatch<SetStateAction<string>>
  direccionError: string
  setDireccionError: Dispatch<SetStateAction<string>>
  direccionDirty: boolean
  setDireccionDirty: Dispatch<SetStateAction<boolean>>
  guestEmail: string
  setGuestEmail: Dispatch<SetStateAction<string>>
  guestEmailError: string
  setGuestEmailError: Dispatch<SetStateAction<string>>
  guestEmailDirty: boolean
  setGuestEmailDirty: Dispatch<SetStateAction<boolean>>
  guestPhone: string
  setGuestPhone: Dispatch<SetStateAction<string>>
  cuponInput: string
  setCuponInput: Dispatch<SetStateAction<string>>
  cuponEstado: string
  setCuponEstado: Dispatch<SetStateAction<string>>
  cuponDescuento: number
  setCuponDescuento: Dispatch<SetStateAction<number>>
  cuponCodigo: string | null
  setCuponCodigo: Dispatch<SetStateAction<string | null>>
  cuponError: string
  setCuponError: Dispatch<SetStateAction<string>>
  gcInput: string
  setGcInput: Dispatch<SetStateAction<string>>
  gcEstado: string
  setGcEstado: Dispatch<SetStateAction<string>>
  gcSaldo: number
  setGcSaldo: Dispatch<SetStateAction<number>>
  gcCodigo: string | null
  setGcCodigo: Dispatch<SetStateAction<string | null>>
  aceptaDatos: boolean
  setAceptaDatos: Dispatch<SetStateAction<boolean>>
  validatePhone: (v: string) => string
  validateAddress: (v: string) => string
  validateGuestEmail: (v: string) => string
  costoEnvio: number
  subtotalCart: number
  descuentoMonto: number
  gcAplicado: number
  totalFinal: number
}

/**
 * Estado local, validaciones de campos y totales del checkout.
 */
export function useCheckoutForm({ items, total }: UseCheckoutFormParams): CheckoutFormState {
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

  function validatePhone(v: string) {
    return mensajeTelefono(v, t)
  }
  function validateAddress(v: string) {
    return mensajeDireccion(v, t)
  }
  function validateGuestEmail(v: string) {
    return mensajeEmailInvitado(v, t)
  }

  const [notas, setNotas] = useState('')

  const [sinpeNombre, setSinpeNombre] = useState('')
  const [sinpeCedula, setSinpeCedula] = useState('')
  const [sinpeTelefono, setSinpeTelefono] = useState('')
  const [sinpeEmail, setSinpeEmail] = useState('')
  const [sinpeNombreErr, setSinpeNombreErr] = useState('')
  const [sinpeCedulaErr, setSinpeCedulaErr] = useState('')

  const [sinpeImagen, setSinpeImagen] = useState<File | null>(null)
  const [sinpeImagenErr, setSinpeImagenErr] = useState('')
  const [sinpeUploadEstado, setSinpeUploadEstado] = useState('idle')
  const [sinpeUploadError, setSinpeUploadError] = useState('')
  const sinpeInputRef = useRef<HTMLInputElement | null>(null)

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
  const [cuponCodigo, setCuponCodigo] = useState<string | null>(null)
  const [cuponError, setCuponError] = useState('')

  const [gcInput, setGcInput] = useState('')
  const [gcEstado, setGcEstado] = useState('idle')
  const [gcSaldo, setGcSaldo] = useState(0)
  const [gcCodigo, setGcCodigo] = useState<string | null>(null)
  const [aceptaDatos, setAceptaDatos] = useState(false)

  const costoEnvio = SHIPPING_COSTS[metodoEnvio] ?? 0
  const subtotalCart = total()
  const descuentoMonto = cuponDescuento > 0 ? Math.round(subtotalCart * cuponDescuento / 100) : 0
  const baseConCupon = subtotalCart - descuentoMonto + costoEnvio
  const gcAplicado = gcSaldo > 0 ? Math.min(gcSaldo, baseConCupon) : 0
  const totalFinal = baseConCupon - gcAplicado

  return {
    bodegaRetiro,
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
    sinpeImagen,
    setSinpeImagen,
    sinpeImagenErr,
    setSinpeImagenErr,
    sinpeUploadEstado,
    setSinpeUploadEstado,
    sinpeUploadError,
    setSinpeUploadError,
    sinpeInputRef,
    telefono,
    setTelefono,
    telefonoError,
    setTelefonoError,
    telefonoDirty,
    setTelefonoDirty,
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
    cuponInput,
    setCuponInput,
    cuponEstado,
    setCuponEstado,
    cuponDescuento,
    setCuponDescuento,
    cuponCodigo,
    setCuponCodigo,
    cuponError,
    setCuponError,
    gcInput,
    setGcInput,
    gcEstado,
    setGcEstado,
    gcSaldo,
    setGcSaldo,
    gcCodigo,
    setGcCodigo,
    aceptaDatos,
    setAceptaDatos,
    validatePhone,
    validateAddress,
    validateGuestEmail,
    costoEnvio,
    subtotalCart,
    descuentoMonto,
    gcAplicado,
    totalFinal,
  }
}
