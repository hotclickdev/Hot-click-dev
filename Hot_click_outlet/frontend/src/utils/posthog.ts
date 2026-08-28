import posthog from 'posthog-js'
import {
  addAdapter,
  addIdentifyAdapter,
  addResetAdapter,
  setAnalyticsConsent,
} from '@/utils/analytics'
import { getCookieConsent } from '@/components/ui/CookieBanner'

let adapterRegistrado = false

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
