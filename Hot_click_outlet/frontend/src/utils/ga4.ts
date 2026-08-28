import { addAdapter, EVENTO, setAnalyticsConsent, type PropsAnalitica } from '@/utils/analytics'
import { getCookieConsent } from '@/components/ui/CookieBanner'

const GA4_ID = import.meta.env.VITE_GA4_ID

type GtagFn = (...args: unknown[]) => void
type GtagGlobal = typeof globalThis & {
  dataLayer?: unknown[]
  gtag?: GtagFn
}

function gtagGlobal(): GtagGlobal {
  return globalThis as GtagGlobal
}

const GA4_EVENT_MAP: Record<string, string> = {
  [EVENTO.PRODUCTO_VISTO]: 'view_item',
  [EVENTO.CARRITO_AGREGADO]: 'add_to_cart',
  [EVENTO.CARRITO_QUITADO]: 'remove_from_cart',
  [EVENTO.WISHLIST_AGREGADO]: 'add_to_wishlist',
  [EVENTO.WISHLIST_QUITADO]: 'remove_from_wishlist',
  [EVENTO.CHECKOUT_INICIADO]: 'begin_checkout',
  [EVENTO.BUSQUEDA]: 'search',
}

function injectGtag(id: string) {
  if (document.getElementById('hc-gtag')) return
  const script = document.createElement('script')
  script.id = 'hc-gtag'
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  script.async = true
  document.head.appendChild(script)

  const g = gtagGlobal()
  g.dataLayer = g.dataLayer ?? []
  g.gtag = (...args: unknown[]) => {
    g.dataLayer?.push(args)
  }
  g.gtag('js', new Date())
  g.gtag('config', id, { send_page_view: false })
}

function hcPayloadToGA4(event: string, data: PropsAnalitica): PropsAnalitica {
  switch (event) {
    case EVENTO.PRODUCTO_VISTO:
    case EVENTO.CARRITO_AGREGADO:
    case EVENTO.CARRITO_QUITADO:
    case EVENTO.WISHLIST_AGREGADO:
    case EVENTO.WISHLIST_QUITADO:
      return {
        currency: 'CRC',
        value: data.monto ?? 0,
        items: [{
          item_id: data.producto_id,
          item_name: data.nombre,
          price: data.monto,
          quantity: data.cantidad ?? 1,
        }],
      }
    case EVENTO.CHECKOUT_INICIADO:
      return { currency: 'CRC', value: data.monto, num_items: data.item_count }
    case EVENTO.BUSQUEDA:
      return { search_term: data.query }
    default:
      return data
  }
}

export function initGA4() {
  if (!GA4_ID) return
  const consent = getCookieConsent()
  if (!consent?.analytics) return

  injectGtag(GA4_ID)
  setAnalyticsConsent(true)
  addAdapter((event, data) => {
    const ga4Event = GA4_EVENT_MAP[event] ?? event
    gtagGlobal().gtag?.('event', ga4Event, hcPayloadToGA4(event, data))
  })
}

export function trackPageView(path: string) {
  const gtag = gtagGlobal().gtag
  if (!GA4_ID || !gtag) return
  gtag('event', 'page_view', { page_path: path })
}
