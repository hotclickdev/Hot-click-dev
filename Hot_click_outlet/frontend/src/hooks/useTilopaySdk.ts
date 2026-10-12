import { useCallback, useRef } from 'react'

const SDK_URL = 'https://app.tilopay.com/sdk/v2/sdk_tpay.min.js'

export type TilopayInitOptions = {
  token: string
  amount: number | string
  orderNumber: string
  redirect: string
  currency?: string
  language?: string
  capture?: number
  subscription?: number
  billToEmail?: string
  billToFirstName?: string
  billToLastName?: string
  billToAddress?: string
  billToCountry?: string
  billToTelephone?: string
  hashVersion?: string
}

type TilopayApi = {
  Init: (options: TilopayInitOptions) => Promise<unknown>
  startPayment: () => Promise<unknown>
  updateOptions?: (options: Record<string, unknown>) => Promise<unknown>
  getSinpeMovil?: () => Promise<TilopaySinpeDatos | undefined>
}

/** Respuesta de Tilopay.getSinpeMovil(): número destino, monto exacto y código para el detalle. */
export type TilopaySinpeDatos = { message?: string; code?: string; amount?: number; number?: string }

declare global {
  interface Window {
    Tilopay?: unknown
  }
}

let sdkPromise: Promise<void> | null = null

function esTilopayApi(value: unknown): value is TilopayApi {
  if (!value || typeof value !== 'object') return false
  const api = value as Record<string, unknown>
  return typeof api.Init === 'function' && typeof api.startPayment === 'function'
}

function obtenerTilopay(): TilopayApi {
  if (!esTilopayApi(window.Tilopay)) {
    throw new Error('SDK de Tilopay no disponible')
  }
  return window.Tilopay
}

/** Carga el script del SDK una sola vez (idempotente si ya está en el DOM). */
export function cargarSdkTilopay(): Promise<void> {
  if (esTilopayApi(window.Tilopay)) return Promise.resolve()
  if (sdkPromise) return sdkPromise

  const existente = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`)
  if (existente) {
    sdkPromise = new Promise((resolve, reject) => {
      if (esTilopayApi(window.Tilopay)) {
        resolve()
        return
      }
      existente.addEventListener('load', () => resolve(), { once: true })
      existente.addEventListener('error', () => reject(new Error('tilopay_sdk')), { once: true })
    })
    return sdkPromise
  }

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      sdkPromise = null
      reject(new Error('tilopay_sdk'))
    }
    document.head.appendChild(script)
  })
  return sdkPromise
}

/**
 * Hook delgado sobre Tilopay.Init / startPayment.
 * Carga el script bajo demanda; tipa window.Tilopay sin `any`.
 */
export function useTilopaySdk() {
  const listoRef = useRef(false)

  const init = useCallback(async (options: TilopayInitOptions) => {
    await cargarSdkTilopay()
    const tilopay = obtenerTilopay()
    const resultado = await tilopay.Init({
      currency: 'CRC',
      language: 'es',
      capture: 1,
      subscription: 0,
      billToCountry: 'CR',
      hashVersion: 'V2',
      ...options,
    })
    listoRef.current = true
    return resultado
  }, [])

  const startPayment = useCallback(async () => {
    if (!listoRef.current) {
      throw new Error('Tilopay no inicializado')
    }
    const tilopay = obtenerTilopay()
    return tilopay.startPayment()
  }, [])

  /**
   * SINPE Móvil por Tilopay: manda la cédula (obligatoria) y pide los datos de la transferencia.
   * getSinpeMovil también arranca la escucha del pago en Tilopay. Sin respuesta = error.
   */
  const iniciarSinpe = useCallback(async (typeDni: number, dni: string): Promise<TilopaySinpeDatos> => {
    if (!listoRef.current) throw new Error('Tilopay no inicializado')
    const tilopay = obtenerTilopay()
    if (!tilopay.updateOptions || !tilopay.getSinpeMovil) throw new Error('SINPE Móvil no disponible')
    await tilopay.updateOptions({ typeDni, dni })
    const datos = await tilopay.getSinpeMovil()
    if (!datos?.number || !datos?.code) throw new Error('SINPE Móvil no disponible')
    return datos
  }, [])

  return { init, startPayment, iniciarSinpe }
}
