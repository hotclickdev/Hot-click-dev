import { addAdapter, EVENTO, type PropsAnalitica } from '@/utils/analytics'
import { getCookieConsent } from '@/components/ui/CookieBanner'
import { attributionEventId } from '@/utils/attribution'

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined

type FbqFn = (...args: unknown[]) => void
type FbqGlobal = typeof globalThis & { fbq?: FbqFn; _fbq?: FbqFn }

function fbqGlobal(): FbqGlobal {
  return globalThis as FbqGlobal
}

function injectPixel(id: string) {
  if (document.getElementById('hc-meta-pixel')) return
  const g = fbqGlobal()
  if (!g.fbq) {
    const fbq: FbqFn = (...args: unknown[]) => {
      const q = (fbq as FbqFn & { callMethod?: FbqFn; queue?: unknown[]; push?: FbqFn }).queue ?? []
      ;(fbq as FbqFn & { queue?: unknown[] }).queue = q
      q.push(args)
    }
    ;(fbq as FbqFn & { loaded?: boolean; version?: string; queue?: unknown[] }).loaded = true
    ;(fbq as FbqFn & { version?: string }).version = '2.0'
    ;(fbq as FbqFn & { queue?: unknown[] }).queue = []
    g.fbq = fbq
    g._fbq = fbq
  }
  const script = document.createElement('script')
  script.id = 'hc-meta-pixel'
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)
  g.fbq?.('init', id)
  g.fbq?.('track', 'PageView')
}

function metaEventFromHotclick(event: string, data: PropsAnalitica): { name: string; params: Record<string, unknown> } | null {
  const eventId = attributionEventId(event, data.producto_id as string | number | null | undefined)
  switch (event) {
    case EVENTO.PRODUCTO_VISTO:
      return {
        name: 'ViewContent',
        params: {
          content_ids: [String(data.producto_id ?? '')],
          content_type: 'product',
          value: data.monto ?? 0,
          currency: 'CRC',
          eventID: eventId,
        },
      }
    case EVENTO.CARRITO_AGREGADO:
      return {
        name: 'AddToCart',
        params: {
          content_ids: [String(data.producto_id ?? '')],
          content_type: 'product',
          value: data.monto ?? 0,
          currency: 'CRC',
          eventID: eventId,
        },
      }
    case EVENTO.CHECKOUT_INICIADO:
      return {
        name: 'InitiateCheckout',
        params: {
          value: data.monto ?? 0,
          currency: 'CRC',
          num_items: data.item_count ?? 0,
          eventID: eventId,
        },
      }
    default:
      return null
  }
}

export function initMetaPixel() {
  if (!PIXEL_ID) return
  const consent = getCookieConsent()
  if (!consent?.analytics) return
  injectPixel(PIXEL_ID)
  addAdapter((event, data) => {
    const mapped = metaEventFromHotclick(event, data)
    if (!mapped) return
    fbqGlobal().fbq?.('track', mapped.name, mapped.params, { eventID: mapped.params.eventID })
  })
}

/** Lee cookies _fbp / _fbc para CAPI. */
export function readMetaCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === 'undefined') return {}
  const out: { fbp?: string; fbc?: string } = {}
  for (const part of document.cookie.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    const v = rest.join('=')
    if (k === '_fbp') out.fbp = v
    if (k === '_fbc') out.fbc = v
  }
  return out
}
