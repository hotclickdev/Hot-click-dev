import posthog from 'posthog-js'
import {
  addAdapter,
  addIdentifyAdapter,
  addResetAdapter,
  setAnalyticsConsent,
} from '@/utils/analytics'
import { getCookieConsent } from '@/utils/cookieConsent'
import { sanitizarPath, sanitizarUrl } from '@/utils/sanitizarUrl'

let adapterRegistrado = false

const PROPS_URL = ['$current_url', '$initial_current_url', '$referrer', '$initial_referrer', '$session_entry_url', '$prev_pageview_pathname']

/**
 * `before_send` de PostHog: sanitiza la URL de CADA captura (incluido el `$pageview` automático): sin hash ni token de
 * invitación de equipo. Sirve aunque alguien pegue un enlace viejo o el `replaceState` falle.
 */
export function sanitizarCapturaPosthog<T extends { properties?: Record<string, unknown> } | null>(cp: T): T {
  if (!cp?.properties) return cp
  const props = cp.properties
  for (const k of PROPS_URL) if (typeof props[k] === 'string') props[k] = sanitizarUrl(props[k] as string)
  for (const k of ['$pathname', '$pageview_pathname']) if (typeof props[k] === 'string') props[k] = sanitizarPath(props[k] as string)
  return cp
}

export function initPostHog() {
  if (!import.meta.env.VITE_POSTHOG_PROJECT_TOKEN) return
  const consent = getCookieConsent()
  if (!consent?.analytics) return

  posthog.opt_in_capturing()
  setAnalyticsConsent(true)
  if (adapterRegistrado) return
  adapterRegistrado = true

  addAdapter((event, data) => {
    const props = { ...data }
    delete props.timestamp
    posthog.capture(event, props)
  })
  addIdentifyAdapter((id, props) => {
    posthog.identify(id, props)
  })
  addResetAdapter(() => {
    posthog.reset()
  })
}
