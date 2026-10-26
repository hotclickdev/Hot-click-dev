/**
 * X-04: solo se redirige a la pasarela de pago (https) o al propio origen.
 * Cualquier otra URL devuelta por el backend/PSP se rechaza.
 */
/** Hosts EXACTOS (sin comodines ni subdominios). */
export const HOSTS_PASARELA: readonly string[] = [
  'checkout.stripe.com', // Stripe Checkout hosted
  'app.tilopay.com', // tilopay.base-url (TilopayService)
  'secure.tilopay.com', // Tilopay pago/3DS (ya permitido en la CSP)
  'checkout.onvopay.com', // ONVO one-time links
]

function origenPropio(): string | null {
  try {
    return globalThis.location?.origin ?? null
  } catch {
    return null
  }
}

export function esRedirectPagoPermitido(
  url: string | null | undefined,
  origen = origenPropio(),
  esDev: boolean = import.meta.env.DEV,
): boolean {
  if (!url || typeof url !== 'string') return false
  let u: URL
  try {
    u = new URL(url, origen ?? undefined)
  } catch {
    return false
  }
  if (u.username || u.password) return false
  // Mismo origen: https; http solo en desarrollo (import.meta.env.DEV) para localhost.
  if (origen && u.origin === origen) return u.protocol === 'https:' || (esDev && u.protocol === 'http:')
  // Pasarelas: https, host exacto y sin puerto explícito.
  if (u.protocol !== 'https:' || u.port !== '') return false
  const host = u.hostname.toLowerCase()
  return HOSTS_PASARELA.includes(host)
}
