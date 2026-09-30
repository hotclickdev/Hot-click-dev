import { reportarEmbudo } from '@/utils/embudoCliente'

/** Capa de analítica por adapters. El tracking no debe romper la tienda. */

export const EVENTO = {
  VISITA: 'visita_tienda',
  PRODUCTO_VISTO: 'producto_visto',
  CARRITO_AGREGADO: 'carrito_agregado',
  CARRITO_QUITADO: 'carrito_quitado',
  CHECKOUT_VISTO: 'checkout_visto',
  CHECKOUT_INICIADO: 'checkout_iniciado',
  CHECKOUT_BLOQUEADO: 'checkout_bloqueado',
  PAGO_INTENTADO: 'pago_intentado',
  PAGO_FALLIDO: 'pago_fallido',
  PAGO_CANCELADO: 'pago_cancelado',
  BUSQUEDA: 'busqueda_realizada',
  BUSQUEDA_SIN_RESULTADOS: 'busqueda_sin_resultados',
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
  try {
    reportarEmbudo(evento, data)
  } catch (err) {
    console.error('[embudo]', err)
  }
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
  visita: () => track(EVENTO.VISITA, {}),
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
  searchQuery: (q: string, count: number) => {
    track(EVENTO.BUSQUEDA, { query: q, results: count })
    if (count === 0) track(EVENTO.BUSQUEDA_SIN_RESULTADOS, { query: q, results: 0 })
  },
  checkoutView: (total: number, n: number) => track(EVENTO.CHECKOUT_VISTO, { monto: total, item_count: n }),
  checkoutBloqueado: (motivo: string) => track(EVENTO.CHECKOUT_BLOQUEADO, { motivo }),
  pagoIntentado: (total: number, n: number) => track(EVENTO.PAGO_INTENTADO, { monto: total, item_count: n }),
  pagoFallido: () => track(EVENTO.PAGO_FALLIDO, {}),
  pagoCancelado: () => track(EVENTO.PAGO_CANCELADO, {}),
  descubriChipsView: () => track('descubri_chips_view', {}),
  descubriChipsSave: (categories: number, bands: number) => track('descubri_chips_save', {
    category_count: categories, band_count: bands,
  }),
  descubriResultsView: (categories: number) => track('descubri_results_view', {
    category_count: categories,
  }),
  descubriInicio: (deckSize: number) => track('descubri_inicio', { deck_size: deckSize }),
  descubriLike: (productoId?: string | number | null) => track('descubri_like', {
    producto_id: productoId ?? null,
  }),
  descubriDescarte: (productoId?: string | number | null) => track('descubri_descarte', {
    producto_id: productoId ?? null,
  }),
  descubriRevelacion: (likes: number, negocios: number) => track('descubri_revelacion', {
    like_count: likes, negocio_count: negocios,
  }),
  homePillar: (pilar: 'comprar' | 'vender' | 'emprender') => track('home_pillar_click', { pilar }),
}
