import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  SHIPPING_COSTS,
  bodegaRetiroDesdeItems,
  opcionesEnvio,
  validateAddress as mensajeDireccion,
  validateGuestEmail as mensajeEmailInvitado,
  validatePhone as mensajeTelefono,
} from './checkoutHelpers'

/**
 * Estado local, validaciones de campos y totales del checkout.
 * @param {{ items: unknown[], total: () => number }} params
 */
export function useCheckoutForm({ items, total }) {
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
