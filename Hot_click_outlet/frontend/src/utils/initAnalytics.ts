import { initClarity } from '@/utils/clarity'
import { initGA4 } from '@/utils/ga4'
import { initMetaPixel } from '@/utils/metaPixel'
import { initPostHog } from '@/utils/posthog'

/** Activa GA4, PostHog, Clarity y Meta Pixel si hay consentimiento y tokens. */
export function initAnalytics() {
  initGA4()
  initPostHog()
  initClarity()
  initMetaPixel()
}
