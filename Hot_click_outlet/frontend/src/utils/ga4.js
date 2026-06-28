// Google Analytics 4 adapter.
// Set VITE_GA4_ID=G-XXXXXXXXXX in your .env / Render env vars.
// Only initializes if the user accepted analytics cookies (checked at call time).

import { addAdapter, setAnalyticsConsent } from '@/utils/analytics'
import { useCookieConsent } from '@/components/ui/CookieBanner'

const GA4_ID = import.meta.env.VITE_GA4_ID

function injectGtag(id) {
  if (document.getElementById('hc-gtag')) return
  const script = document.createElement('script')
  script.id  = 'hc-gtag'
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  script.async = true
  document.head.appendChild(script)

  globalThis.dataLayer = globalThis.dataLayer ?? []
  globalThis.gtag = function () { globalThis.dataLayer.push(arguments) }
  globalThis.gtag('js', new Date())
  globalThis.gtag('config', id, { send_page_view: false })
}

// Event name mapping: internal HC name → GA4 recommended event name
const GA4_EVENT_MAP = {
  product_view:    'view_item',
  add_to_cart:     'add_to_cart',
  remove_from_cart:'remove_from_cart',
  wishlist_add:    'add_to_wishlist',
  wishlist_remove: 'remove_from_wishlist',
  checkout_start:  'begin_checkout',
  search_query:    'search',
}

function hcPayloadToGA4(event, data) {
  switch (event) {
    case 'product_view':
    case 'add_to_cart':
    case 'remove_from_cart':
    case 'wishlist_add':
    case 'wishlist_remove':
      return {
        currency: 'CRC',
        value: data.price ?? 0,
        items: [{ item_id: data.id, item_name: data.name, price: data.price, quantity: data.quantity ?? 1 }],
      }
    case 'checkout_start':
      return { currency: 'CRC', value: data.total, num_items: data.item_count }
    case 'search_query':
      return { search_term: data.query }
    default:
      return data
  }
}

export function initGA4() {
  if (!GA4_ID) return

  const consent = useCookieConsent()
  if (!consent?.analytics) return

  injectGtag(GA4_ID)
  setAnalyticsConsent(true)

  addAdapter((event, data) => {
    const ga4Event = GA4_EVENT_MAP[event] ?? event
    globalThis.gtag?.('event', ga4Event, hcPayloadToGA4(event, data))
  })
}

// Page view tracker — call on every route change
export function trackPageView(path) {
  if (!GA4_ID || !globalThis.gtag) return
  globalThis.gtag('event', 'page_view', { page_path: path })
}
