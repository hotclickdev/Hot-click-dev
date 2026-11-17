import { getCookieConsent } from '@/utils/cookieConsent'
import { llevaTokenInvitacion } from '@/utils/sanitizarUrl'

const CLARITY_ID = import.meta.env.VITE_CLARITY_ID

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void
  }
}

export function initClarity() {
  if (!CLARITY_ID || document.getElementById('hc-clarity')) return
  const consent = getCookieConsent()
  if (!consent?.analytics) return
  // Clarity lee location.href tal cual y no deja reescribirlo: si por cualquier motivo la URL todavía lleva un token de
  // invitación (replaceState falló), no se carga en esta página.
  if (llevaTokenInvitacion(globalThis.location?.href ?? '')) return

  const script = document.createElement('script')
  script.id = 'hc-clarity'
  script.async = true
  script.src = `https://www.clarity.ms/tag/${CLARITY_ID}`
  document.head.appendChild(script)
}
