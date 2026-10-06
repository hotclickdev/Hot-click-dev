import { useState, useRef, useMemo, useEffect, useCallback, type Dispatch, type SetStateAction, type RefObject } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'
import usePedidoExtrasStore from '@/store/pedidoExtrasStore'
import { adminService } from '@/services/orderService'
import {
  BODEGA_DEFAULT,
  SHIPPING_COSTS,
  bodegaRetiroDePaquete,
  bodegaRetiroDesdeItems,
  opcionesEnvio,
  paquetesDesdeItems,
  validateAddress as mensajeDireccion,
  validateGuestEmail as mensajeEmailInvitado,
  validatePhone as mensajeTelefono,
} from './checkoutHelpers'
import { direccionCompleta, esDestinoGAM } from './ubicacionesCR'
import { pasoDesdeQuery, type OpcionesPaso } from './pasosCheckoutHelpers'
import type { BodegaRetiro, ItemCheckout, OpcionEnvio, PaqueteCheckout } from './checkoutHelpers'

type UseCheckoutFormParams = {
  items: ItemCheckout[]
  total: () => number
}

export type CheckoutFormState = {
  bodegaRetiro: BodegaRetiro | null
  SHIPPING_OPTIONS: OpcionEnvio[]
  metodoEnvio: string
  setMetodoEnvio: (value: string) => void
  /** Un paquete = productos de una misma bodega/vendedor. Longitud 1 = carrito de un solo vendedor. */
  paquetes: PaqueteCheckout[]
  metodoEnvioPorPaquete: Record<string, string>
  setMetodoEnvioPaquete: (bodegaId: string, value: string) => void
  /** true si algún paquete necesita dirección de entrega (no todos van a retiro en tienda). */
  necesitaDireccion: boolean
  /** true si algún paquete usa un método cuyo costo no cobra HotClick (ej. encomienda) — el total mostrado no lo incluye. */
  envioVaria: boolean
  /** Paso del checkout móvil (1 datos, 2 entrega, 3 pago). Vive aquí para sobrevivir a la pantalla de carga del pago. */
  paso: number
  /** Cambia `?paso=` (R3): agrega al historial salvo `reemplazar`. */
  setPaso: (paso: number, opciones?: OpcionesPaso) => void
  metodoPago: string
  setMetodoPago: Dispatch<SetStateAction<string>>
  notas: string
  setNotas: (value: string) => void
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
  /** Señas exactas. La dirección completa del pedido es `direccionPedido`. */
  direccion: string
  setDireccion: Dispatch<SetStateAction<string>>
  provincia: string
  /** Destino dentro del GAM: define cuál de los dos envíos normales se ofrece. */
  destinoGAM: boolean
  setProvincia: (value: string) => void
  canton: string
  setCanton: (value: string) => void
  distrito: string
  setDistrito: Dispatch<SetStateAction<string>>
  direccionPedido: string
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
  guestPhoneError: string
  setGuestPhoneError: Dispatch<SetStateAction<string>>
  guestPhoneDirty: boolean
  setGuestPhoneDirty: Dispatch<SetStateAction<boolean>>
  cuponInput: string
  setCuponInput: (value: string) => void
  cuponEstado: string
  setCuponEstado: (value: string) => void
  cuponDescuento: number
  setCuponDescuento: (value: number) => void
  cuponCodigo: string | null
  setCuponCodigo: (value: string | null) => void
  cuponError: string
  setCuponError: (value: string) => void
  gcInput: string
  setGcInput: (value: string) => void
  gcEstado: string
  setGcEstado: (value: string) => void
  gcSaldo: number
  setGcSaldo: (value: number) => void
  gcCodigo: string | null
  setGcCodigo: (value: string | null) => void
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

  const paquetes = useMemo(() => paquetesDesdeItems(items), [items])
  // Único paquete: comportamiento idéntico al carrito de un solo vendedor de siempre.
  const bodegaRetiro = paquetes.length === 1 ? bodegaRetiroDePaquete(paquetes[0]) : bodegaRetiroDesdeItems(items)
  const SHIPPING_OPTIONS = opcionesEnvio(bodegaRetiro)

  // Destino: define cuál de los dos envíos normales se ofrece (dentro o fuera del GAM, Figma 37:1689).
  const [provincia, setProvinciaState] = useState('')
  const [canton, setCantonState] = useState('')
  const [distrito, setDistrito] = useState('')
  const destinoGAM = esDestinoGAM(provincia, canton)
  function setProvincia(value: string) {
    setProvinciaState(value)
    setCantonState('')
    setDistrito('')
  }
  function setCanton(value: string) {
    setCantonState(value)
    setDistrito('')
  }

  const [metodoEnvioBase, setMetodoEnvioPorPaqueteState] = useState<Record<string, string>>({})
  const metodoEnvioPorPaquete = useMemo(() => {
    const normal = destinoGAM ? 'ENVIO_NORMAL_GAM' : 'ENVIO_NORMAL_FUERA_GAM'
    const resultado: Record<string, string> = {}
    for (const [id, valor] of Object.entries(metodoEnvioBase)) {
      resultado[id] = valor.startsWith('ENVIO_NORMAL') || (valor === 'ENVIO_RAPIDO' && !destinoGAM) ? normal : valor
    }
    return resultado
  }, [metodoEnvioBase, destinoGAM])
  // Figma 29:1344 abre con SINPE Móvil seleccionado.
  const [metodoPago, setMetodoPago] = useState('SINPE')
  // R3: el paso del checkout móvil vive en `?paso=`; el guard de CheckoutLayout impide saltar pasos.
  const [searchParams, setSearchParams] = useSearchParams()
  const paso = pasoDesdeQuery(searchParams.get('paso'))
  const setPaso = useCallback((nuevo: number, opciones?: OpcionesPaso) => {
    setSearchParams((prev) => {
      const sig = new URLSearchParams(prev)
      sig.set('paso', String(pasoDesdeQuery(String(nuevo))))
      return sig
    }, { replace: opciones?.reemplazar ?? false })
  }, [setSearchParams])

  useEffect(() => {
    setMetodoEnvioPorPaqueteState((prev) => {
      const next: Record<string, string> = {}
      for (const p of paquetes) {
        const opciones = opcionesEnvio(bodegaRetiroDePaquete(p))
        const actual = prev[p.bodegaId]
        next[p.bodegaId] = actual && opciones.some((o) => o.value === actual)
          ? actual
          : (opciones[0]?.value ?? 'ENVIO_NORMAL_GAM')
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  function setMetodoEnvioPaquete(bodegaId: string, value: string) {
    setMetodoEnvioPorPaqueteState((prev) => ({ ...prev, [bodegaId]: value }))
  }

  const bodegaPrincipalId = paquetes[0]?.bodegaId ?? String(BODEGA_DEFAULT)
  const metodoEnvio = metodoEnvioPorPaquete[bodegaPrincipalId] ?? 'ENVIO_NORMAL_GAM'
  function setMetodoEnvio(value: string) {
    setMetodoEnvioPaquete(bodegaPrincipalId, value)
  }

  const necesitaDireccion = paquetes.some((p) => {
    const opciones = opcionesEnvio(bodegaRetiroDePaquete(p))
    return opciones.find((o) => o.value === metodoEnvioPorPaquete[p.bodegaId])?.needsAddress ?? false
  })

  // Encomienda cuesta 0 en el pago de HotClick (la empresa de transporte cobra directo al recibir) —
  // el total del checkout no debe leerse como "envío gratis" cuando en realidad el costo varía y lo paga el cliente aparte.
  const envioVaria = paquetes.some((p) => {
    const opciones = opcionesEnvio(bodegaRetiroDePaquete(p))
    return opciones.find((o) => o.value === metodoEnvioPorPaquete[p.bodegaId])?.varia ?? false
  })

  function validatePhone(v: string) {
    return mensajeTelefono(v, t)
  }
  function validateAddress(v: string) {
    return mensajeDireccion(v, t)
  }
  function validateGuestEmail(v: string) {
    return mensajeEmailInvitado(v, t)
  }

  // Notas, cupón y gift card viven en el store compartido con el carrito (Figma 51:1820).
  const {
    notas, setNotas,
    cuponInput, setCuponInput, cuponEstado, setCuponEstado, cuponDescuento, setCuponDescuento,
    cuponCodigo, setCuponCodigo, cuponError, setCuponError,
    gcInput, setGcInput, gcEstado, setGcEstado, gcSaldo, setGcSaldo, gcCodigo, setGcCodigo,
  } = usePedidoExtrasStore()

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

  const userId = useAuthStore((s) => s.userId)
  const authToken = useAuthStore((s) => s.token)
  useEffect(() => {
    if (!authToken || !userId) return
    let cancelado = false
    adminService.getUsuario(userId).then(({ data }) => {
      if (cancelado) return
      const usuario = (data as { data?: { telefono?: string } })?.data
      if (usuario?.telefono) {
        // Solo completa si el usuario todavía no escribió nada (no pisa su input).
        setTelefono((prev) => prev || usuario.telefono || '')
      }
    }).catch(() => { /* prellenado best-effort; el campo queda vacío y editable */ })
    return () => { cancelado = true }
  }, [authToken, userId])

  const [guestEmail, setGuestEmail] = useState('')
  const [guestEmailError, setGuestEmailError] = useState('')
  const [guestEmailDirty, setGuestEmailDirty] = useState(false)
  const [guestPhone, setGuestPhone] = useState('')
  const [guestPhoneError, setGuestPhoneError] = useState('')
  const [guestPhoneDirty, setGuestPhoneDirty] = useState(false)

  const [aceptaDatos, setAceptaDatos] = useState(false)

  const costoEnvio = paquetes.reduce((sum, p) => sum + (SHIPPING_COSTS[metodoEnvioPorPaquete[p.bodegaId]] ?? 0), 0)
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
    paquetes,
    metodoEnvioPorPaquete,
    setMetodoEnvioPaquete,
    necesitaDireccion,
    envioVaria,
    paso,
    setPaso,
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
    provincia,
    destinoGAM,
    setProvincia,
    canton,
    setCanton,
    distrito,
    setDistrito,
    direccionPedido: direccionCompleta(direccion, canton, provincia, distrito),
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
    guestPhoneError,
    setGuestPhoneError,
    guestPhoneDirty,
    setGuestPhoneDirty,
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
