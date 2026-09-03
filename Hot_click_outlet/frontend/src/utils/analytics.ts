/** Capa de analítica por adapters. El tracking no debe romper la tienda. */

export const EVENTO = {
  PRODUCTO_VISTO: 'producto_visto',
  CARRITO_AGREGADO: 'carrito_agregado',
  CARRITO_QUITADO: 'carrito_quitado',
  CHECKOUT_INICIADO: 'checkout_iniciado',
  BUSQUEDA: 'busqueda_realizada',
  WISHLIST_AGREGADO: 'wishlist_agregado',
  WISHLIST_QUITADO: 'wishlist_quitado',
} as const

export type PropsAnalitica = Record<string, unknown>
export type AdapterAnalitica = (evento: string, data: PropsAnalitica) => void
export type IdentifyAdapter = (distinctId: string, props: PropsAnalitica) => void

type ItemAnalitica = {
  id?: string | number
  nombre?: string
  precio?: number
  categoriaNombre?: string
}

const adapters: AdapterAnalitica[] = []
const identifyAdapters: IdentifyAdapter[] = []
const resetAdapters: Array<() => void> = []
let analyticsEnabled = false

const CONSENT_KEY = 'hotclick-cookie-consent'

function loadConsentFromStorage() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'analytics' in parsed) {
      analyticsEnabled = Boolean((parsed as { analytics?: unknown }).analytics)
    }
  } catch {
    analyticsEnabled = false
  }
}

loadConsentFromStorage()

export function setAnalyticsConsent(enabled: unknown) {
  analyticsEnabled = Boolean(enabled)
}

export function addAdapter(fn: AdapterAnalitica) {
  adapters.push(fn)
}

export function addIdentifyAdapter(fn: IdentifyAdapter) {
  identifyAdapters.push(fn)
}

export function addResetAdapter(fn: () => void) {
  resetAdapters.push(fn)
}

function track(evento: string, payload: PropsAnalitica = {}) {
  if (!analyticsEnabled && !import.meta.env.DEV) return
  const data = { ...payload, timestamp: Date.now() }
  adapters.forEach((fn) => {
    try {
      fn(evento, data)
    } catch (err) {
      console.error('[analytics]', err)
    }
  })
}

/**
 * Identifica al usuario logueado sin PII (sin correo).
 */
export function identifyUser(opts: {
  userId?: string | number | null
  rol?: string | null
  empresaId?: number | null
}) {
  if (!opts.userId) return
  if (!analyticsEnabled && !import.meta.env.DEV) return
  const props: PropsAnalitica = {}
  if (opts.rol) props.rol = opts.rol
  if (opts.empresaId != null) props.empresa_id = opts.empresaId
  identifyAdapters.forEach((fn) => {
    try {
      fn(String(opts.userId), props)
    } catch (err) {
      console.error('[analytics.identify]', err)
    }
  })
}

export function resetAnalyticsUser() {
  resetAdapters.forEach((fn) => {
    try {
      fn()
    } catch (err) {
      console.error('[analytics.reset]', err)
    }
  })
}

export const analytics = {
  productView: (p: ItemAnalitica) => track(EVENTO.PRODUCTO_VISTO, {
    producto_id: p.id, monto: p.precio, categoria: p.categoriaNombre, origen: 'catalogo',
  }),
  addToCart: (p: ItemAnalitica, qty?: number) => track(EVENTO.CARRITO_AGREGADO, {
    producto_id: p.id, monto: p.precio, cantidad: qty ?? 1,
  }),
  removeFromCart: (id: string | number, name: string) => track(EVENTO.CARRITO_QUITADO, { producto_id: id, nombre: name }),
  wishlistAdd: (p: ItemAnalitica) => track(EVENTO.WISHLIST_AGREGADO, { producto_id: p.id, monto: p.precio }),
  wishlistRemove: (id: string | number) => track(EVENTO.WISHLIST_QUITADO, { producto_id: id }),
  quickViewOpen: (p: ItemAnalitica) => track('vista_rapida', { producto_id: p.id }),
  searchQuery: (q: string, count: number) => track(EVENTO.BUSQUEDA, { query: q, results: count }),
  checkoutStart: (total: number, n: number) => track(EVENTO.CHECKOUT_INICIADO, { monto: total, item_count: n }),
  descubriChipsView: () => track('descubri_chips_view', {}),
  descubriChipsSave: (categories: number, bands: number) => track('descubri_chips_save', {
    category_count: categories, band_count: bands,
  }),
  descubriResultsView: (categories: number) => track('descubri_results_view', {
    category_count: categories,
  }),
  homePillar: (pilar: 'comprar' | 'vender' | 'emprender') => track('home_pillar_click', { pilar }),
}
