export const COOKIE_CONSENT_KEY = 'hotclick-cookie-consent'
export const EVENTO_ABRIR_PREFERENCIAS_COOKIES = 'hotclick-abrir-preferencias-cookies'
export const VIGENCIA_CONSENTIMIENTO_MS = 365 * 24 * 60 * 60 * 1000

export type CookieConsent = {
  analytics: boolean
  advertising: boolean
  functional: boolean
  timestamp: number
}

/**
 * Sin publicidad (decisión del dueño): `advertising` se guarda siempre en false. El parámetro queda para
 * no romper a quien lo llama; «Aceptar todas» solo activa análisis.
 */
export function consentDesdeCategorias(analytics: boolean, advertising?: boolean): CookieConsent {
  void advertising
  return { analytics, advertising: false, functional: true, timestamp: Date.now() }
}

export function parseCookieConsent(raw: string): CookieConsent | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const obj = parsed as { analytics?: unknown; advertising?: unknown; functional?: unknown; timestamp?: unknown }
    if (typeof obj.analytics !== 'boolean') return null
    const analytics = obj.analytics
    return {
      analytics,
      advertising: false,
      functional: obj.functional === true,
      timestamp: typeof obj.timestamp === 'number' ? obj.timestamp : Date.now(),
    }
  } catch {
    return null
  }
}

export function getCookieConsent(): CookieConsent | null {
  const raw = localStorage.getItem(COOKIE_CONSENT_KEY)
  if (!raw) return null
  const consent = parseCookieConsent(raw)
  if (!consent) return null
  if (Date.now() - consent.timestamp > VIGENCIA_CONSENTIMIENTO_MS) return null
  return consent
}

export function setCookieConsent(value: CookieConsent) {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(value))
}

export function abrirPreferenciasCookies() {
  window.dispatchEvent(new Event(EVENTO_ABRIR_PREFERENCIAS_COOKIES))
}

export function useCookieConsent() {
  return getCookieConsent()
}
