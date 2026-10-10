import { EVENTO_CONSENTIMIENTO_CAMBIADO, getCookieConsent, type CookieConsent } from '@/utils/cookieConsent'

/**
 * Cookies y claves propias de analítica (ver /contenido/legal-final/cookies-lista.md).
 * Solo se crean con consentimiento de análisis; con «Solo esenciales» o al revocarlo se borran.
 * Todas se escriben con Path=/ y sin Domain (host actual), así que se borran igual.
 */
export const COOKIES_ANALITICA = ['hotclick_visitor_id', 'hc_attr', 'hc_ai_beh'] as const
export const STORAGE_ANALITICA = ['hotclick-attribution'] as const

/** True solo si hay una elección vigente que acepta análisis. */
export function hayConsentimientoAnalitica(): boolean {
  try {
    return getCookieConsent()?.analytics === true
  } catch {
    return false
  }
}

/** Borra las cookies y claves de analítica propias (mismo Path=/ y sin Domain con que se crearon). */
export function borrarRastreoAnalitica(): void {
  if (typeof document !== 'undefined') {
    for (const nombre of COOKIES_ANALITICA) {
      document.cookie = `${nombre}=; Path=/; Max-Age=0; SameSite=Lax`
    }
  }
  try {
    for (const clave of STORAGE_ANALITICA) localStorage.removeItem(clave)
  } catch {
    /* sin almacenamiento */
  }
}

/**
 * Sincroniza el rastreo con el consentimiento: al iniciar, borra lo que haya sin permiso de análisis;
 * si después se acepta análisis, llama a `alAceptar` (empieza desde ahí, sin recuperar lo anterior);
 * si se elige «Solo esenciales» o se revoca, borra todo. Devuelve la función para desuscribirse.
 */
export function sincronizarRastreoConConsentimiento(alAceptar?: () => void): () => void {
  if (!hayConsentimientoAnalitica()) borrarRastreoAnalitica()
  const alCambiar = (e: Event) => {
    const consent = (e as CustomEvent<CookieConsent | undefined>).detail
    if (consent?.analytics) alAceptar?.()
    else borrarRastreoAnalitica()
  }
  globalThis.addEventListener(EVENTO_CONSENTIMIENTO_CAMBIADO, alCambiar)
  return () => globalThis.removeEventListener(EVENTO_CONSENTIMIENTO_CAMBIADO, alCambiar)
}
