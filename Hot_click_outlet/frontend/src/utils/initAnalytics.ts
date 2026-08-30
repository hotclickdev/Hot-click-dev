import { initClarity } from '@/utils/clarity'
import { initGA4 } from '@/utils/ga4'
import { initPostHog } from '@/utils/posthog'

/** Activa GA4, PostHog y Clarity si hay consentimiento y tokens. */
export function initAnalytics() {
  initGA4()
  initPostHog()
  initClarity()
}
