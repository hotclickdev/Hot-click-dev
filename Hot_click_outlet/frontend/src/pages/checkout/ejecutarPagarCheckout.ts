import { authService } from '@/services/authService'
import { analytics } from '@/utils/analytics'
import { attributionForCheckout } from '@/utils/attribution'
import { readMetaCookies } from '@/utils/metaPixel'
import { BODEGA_DEFAULT, bodegaRetiroDePaquete, opcionesEnvio } from './checkoutHelpers'
import type { BodegaRetiro, ItemCheckout, PaqueteCheckout } from './checkoutHelpers'
import type { CheckoutPayload } from '@/types/pedido'

/** Etiqueta legible del método de envío elegido para un paquete, para el resumen en notas. */
function opcionesParaLabel(p: PaqueteCheckout, metodo: string): string {
  const opciones = opcionesEnvio(bodegaRetiroDePaquete(p))
  const label = opciones.find((o) => o.value === metodo)?.label
  return label ? `${p.bodegaNombre}: ${label}` : ''
}

type ValidateDomicilioDeps = {
  necesitaDireccion: boolean
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
 * `necesitaDireccion` ya contempla los N paquetes del pedido (uno o varios vendedores).
 */
export function ejecutarValidateDomicilio({
  necesitaDireccion, direccion, token, telefono,
  validateAddress, validatePhone,
  setDireccionError, setDireccionDirty, setTelefonoError, setTelefonoDirty,
}: ValidateDomicilioDeps): boolean {
  if (!necesitaDireccion) return true
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
  validatePhone: (v: string) => string
  guestEmail: string
  setGuestEmailError: (v: string) => void
  setGuestEmailDirty: (v: boolean) => void
  guestPhone: string
  setGuestPhoneError: (v: string) => void
  setGuestPhoneDirty: (v: boolean) => void
  metodoPago: string
  sinpeNombre: string
  sinpeCedula: string
  setSinpeNombreErr: (v: string) => void
  setSinpeCedulaErr: (v: string) => void
  telefono: string
  metodoEnvio: string
  paquetes: PaqueteCheckout[]
  metodoEnvioPorPaquete: Record<string, string>
  necesitaDireccion: boolean
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

  // Requiere teléfono de contacto si al menos un paquete se entrega (no todos van a retiro en tienda).
  const requiereEntrega = paquetes.some((p) => metodoEnvioPorPaquete[p.bodegaId] !== 'RETIRO_EN_TIENDA')

  if (!token) {
    const eErr = validateGuestEmail(guestEmail)
    setGuestEmailError(eErr)
    setGuestEmailDirty(true)
    if (eErr) return

    if (requiereEntrega) {
      const pErr = validatePhone(guestPhone)
      setGuestPhoneError(pErr)
      setGuestPhoneDirty(true)
      if (pErr) return
    } else {
      setGuestPhoneError('')
    }
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
  const resumenEnvios = paquetes
    .map((p) => opcionesParaLabel(p, metodoEnvioPorPaquete[p.bodegaId]))
    .filter(Boolean)
    .join('; ')
  const notasFull = [
    notas.trim(),
    necesitaDireccion && phoneEfectivo ? `Teléfono: ${phoneEfectivo}` : '',
    necesitaDireccion && direccion ? `Dirección: ${direccion}` : '',
    metodoPago === 'SINPE' && sinpeCedula ? `Cédula: ${sinpeCedula}` : '',
    resumenEnvios ? `Envío: ${resumenEnvios}` : '',
  ].filter(Boolean).join(' | ')

  const isManual = metodoPago === 'SINPE' || metodoPago === 'EFECTIVO'
  analytics.checkoutStart(totalFinal, items.reduce((s, i) => s + (i.cantidad as number), 0))
  const atrib = attributionForCheckout()
  const metaCookies = readMetaCookies()
  iniciarPago(
    {
      bodegaId: metodoEnvio === 'RETIRO_EN_TIENDA' && bodegaRetiro ? bodegaRetiro.id as number : BODEGA_DEFAULT,
      metodoEnvio,
      envios: paquetes.map((p) => ({
        bodegaId: Number(p.bodegaId),
        metodoEnvio: metodoEnvioPorPaquete[p.bodegaId],
      })),
      notas: notasFull || null,
      provider: metodoPago,
      items: items.map((i) => ({
        productoId: i.id,
        cantidad: i.cantidad,
        ...(i.personalizacion
          ? {
              personalizacion: {
                imagenes: i.personalizacion.imagenes || [],
                notas: i.personalizacion.notas || null,
                tallaSeleccionada: i.personalizacion.tallaSeleccionada || null,
                encargoToken: i.personalizacion.encargoToken || null,
              },
            }
          : {}),
      })),
      codigoCupon: cuponCodigo || null,
      codigoGiftCard: gcCodigo || null,
      ...(atrib
        ? {
            atribucion: {
              first: atrib.first,
              last: atrib.last,
              ...metaCookies,
            },
          }
        : metaCookies.fbp || metaCookies.fbc
          ? { atribucion: { first: null, last: null, ...metaCookies } }
          : {}),
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
