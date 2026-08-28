import { authService } from '@/services/authService'
import { analytics } from '@/utils/analytics'
import { BODEGA_DEFAULT } from './checkoutHelpers'
import type { BodegaRetiro, ItemCheckout, OpcionEnvio } from './checkoutHelpers'
import type { CheckoutPayload } from '@/types/pedido'

type ValidateDomicilioDeps = {
  SHIPPING_OPTIONS: OpcionEnvio[]
  metodoEnvio: string
  direccion: string
  token: string | null
  telefono: string
  validateAddress: (v: string) => string
  validatePhone: (v: string) => string
  setDireccionError: (v: string) => void
  setDireccionDirty: (v: boolean) => void
  setTelefonoError: (v: string) => void
  setTelefonoDirty: (v: boolean) => void
}

/**
 * Valida dirección/teléfono de domicilio — mismo orden que el original.
 */
export function ejecutarValidateDomicilio({
  SHIPPING_OPTIONS, metodoEnvio, direccion, token, telefono,
  validateAddress, validatePhone,
  setDireccionError, setDireccionDirty, setTelefonoError, setTelefonoDirty,
}: ValidateDomicilioDeps): boolean {
  const op = SHIPPING_OPTIONS.find((o) => o.value === metodoEnvio)
  if (!op?.needsAddress) return true
  const dErr = validateAddress(direccion)
  setDireccionError(dErr)
  setDireccionDirty(true)
  if (token) {
    const tErr = validatePhone(telefono)
    setTelefonoError(tErr)
    setTelefonoDirty(true)
    return !tErr && !dErr
  }
  return !dErr
}

type PagarCheckoutDeps = {
  aceptaDatos: boolean
  validateDomicilio: () => boolean
  token: string | null
  validateGuestEmail: (v: string) => string
  guestEmail: string
  setGuestEmailError: (v: string) => void
  setGuestEmailDirty: (v: boolean) => void
  metodoPago: string
  sinpeNombre: string
  sinpeCedula: string
  setSinpeNombreErr: (v: string) => void
  setSinpeCedulaErr: (v: string) => void
  telefono: string
  guestPhone: string
  SHIPPING_OPTIONS: OpcionEnvio[]
  metodoEnvio: string
  notas: string
  direccion: string
  sinpeEmail: string
  totalFinal: number
  items: ItemCheckout[]
  bodegaRetiro: BodegaRetiro | null
  cuponCodigo: string | null
  gcCodigo: string | null
  sinpeTelefono: string
  iniciarPago: (payload: CheckoutPayload, isGuest?: boolean, isSinpe?: boolean) => void
}

/**
 * Inicia el pago — mismo orden de consentimiento, analytics e iniciarPago.
 */
export function ejecutarPagarCheckout(deps: PagarCheckoutDeps) {
  const {
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
  } = deps

  if (!aceptaDatos) return
  if (!validateDomicilio()) return

  if (!token) {
    const eErr = validateGuestEmail(guestEmail)
    setGuestEmailError(eErr)
    setGuestEmailDirty(true)
    if (eErr) return
  }

  if (metodoPago === 'SINPE') {
    let valid = true
    if (sinpeNombre.trim()) {
      setSinpeNombreErr('')
    } else {
      setSinpeNombreErr('El nombre completo es requerido')
      valid = false
    }
    if (sinpeCedula.trim()) {
      setSinpeCedulaErr('')
    } else {
      setSinpeCedulaErr('El número de cédula es requerido')
      valid = false
    }
    if (!valid) return
  }

  authService.registrarConsentimiento('CHECKOUT')

  const phoneEfectivo = token ? telefono : guestPhone
  const opEnvio = SHIPPING_OPTIONS.find((o) => o.value === metodoEnvio)
  const notasFull = [
    notas.trim(),
    opEnvio?.needsAddress && phoneEfectivo ? `Teléfono: ${phoneEfectivo}` : '',
    opEnvio?.needsAddress && direccion ? `Dirección: ${direccion}` : '',
    metodoPago === 'SINPE' && sinpeCedula ? `Cédula: ${sinpeCedula}` : '',
    opEnvio ? `Envío: ${opEnvio.label}` : '',
  ].filter(Boolean).join(' | ')

  const isManual = metodoPago === 'SINPE' || metodoPago === 'EFECTIVO'
  analytics.checkoutStart(totalFinal, items.reduce((s, i) => s + (i.cantidad as number), 0))
  iniciarPago(
    {
      bodegaId: metodoEnvio === 'RETIRO_EN_TIENDA' && bodegaRetiro ? bodegaRetiro.id as number : BODEGA_DEFAULT,
      metodoEnvio,
      notas: notasFull || null,
      provider: metodoPago,
      items: items.map((i) => ({ productoId: i.id, cantidad: i.cantidad })),
      codigoCupon: cuponCodigo || null,
      codigoGiftCard: gcCodigo || null,
      ...(token
        ? {}
        : {
            guestEmail: metodoPago === 'SINPE' ? (sinpeEmail.trim() || guestEmail.trim()) : guestEmail.trim(),
            guestPhone: guestPhone || sinpeTelefono || null,
          }),
    },
    !token,
    isManual,
  )
}
