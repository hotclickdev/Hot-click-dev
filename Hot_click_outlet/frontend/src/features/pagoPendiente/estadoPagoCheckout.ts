import { claveTokenEstado } from './privacidadToken'

/**
 * S4-22 · Puente checkout → «Pago pendiente» (contrato #207). El checkout (`POST /api/payments/checkout` y
 * `/guest-checkout`) devuelve `estadoPagoToken` (64 hex, solo lectura, distinto del `cancelToken`).
 * - Se guarda en sessionStorage con la misma clave que lee la página de #179, así el token nunca va en la URL
 *   (ni en el Referer, ni en el pageview de PostHog/Clarity, ni en Sentry).
 * - Si el pago queda pendiente dentro de ONVO (SINPE de ONVO, sin redirección), se lleva al comprador a
 *   `/checkout/pendiente/{numero}`. Nunca se muestra un número SINPE propio: el SINPE es el de ONVO.
 */
export type RespuestaCheckoutEstado = {
  numeroPedido?: string
  estadoPagoToken?: string
  proveedor?: string
  redirectUrl?: string
}

const TOKEN_ESTADO = /^[0-9a-f]{64}$/i

export function tokenEstadoValido(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_ESTADO.test(token)
}

type StorageLike = { setItem(k: string, v: string): void }

/** Guarda el token del pedido para la página de estado. Devuelve si lo guardó. */
export function guardarTokenEstadoPago(data: RespuestaCheckoutEstado | null | undefined, storage: StorageLike | null): boolean {
  if (!data?.numeroPedido || !tokenEstadoValido(data.estadoPagoToken) || !storage) return false
  try { storage.setItem(claveTokenEstado(data.numeroPedido), data.estadoPagoToken); return true } catch { return false }
}

/**
 * Ruta de la página de estado si el pago queda pendiente dentro de ONVO; `null` si no aplica (sin token, efectivo,
 * gift card o pago con redirección a ONVO, donde el comprador primero paga allá).
 */
export function rutaEstadoPago(data: RespuestaCheckoutEstado | null | undefined): string | null {
  if (!data?.numeroPedido || !tokenEstadoValido(data.estadoPagoToken)) return null
  if (data.proveedor === 'EFECTIVO' || data.proveedor === 'GIFT_CARD') return null
  if (data.redirectUrl) return null
  return `/checkout/pendiente/${encodeURIComponent(data.numeroPedido)}`
}
