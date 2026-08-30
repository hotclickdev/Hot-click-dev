import { getCookieConsent } from '@/components/ui/CookieBanner'

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

  const script = document.createElement('script')
  script.id = 'hc-clarity'
  script.async = true
  script.src = `https://www.clarity.ms/tag/${CLARITY_ID}`
  document.head.appendChild(script)
}
