// Adapter-pattern analytics layer.
// Add adapters (GA4, Mixpanel, etc.) via addAdapter().
// Analytics adapters only run when the user has accepted analytics cookies.
// Console adapter active in dev by default (ignores consent check in dev).

const _adapters = []
let _analyticsEnabled = false

const CONSENT_KEY = 'hotclick-cookie-consent'

function loadConsentFromStorage() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      _analyticsEnabled = !!parsed.analytics
    }
  } catch (_) {}
}

loadConsentFromStorage()

export function setAnalyticsConsent(enabled) {
  _analyticsEnabled = enabled
}

export function addAdapter(fn) {
  _adapters.push(fn)
}

function track(event, payload = {}) {
  if (!_analyticsEnabled && !import.meta.env.DEV) return
  const data = { ...payload, timestamp: Date.now() }
  _adapters.forEach((fn) => {
    try { fn(event, data) } catch (_) {}
  })
}


export const analytics = {
  productView:    (p)        => track('product_view',    { id: p.id, name: p.nombre, price: p.precio, category: p.categoriaNombre }),
  addToCart:      (p, qty)   => track('add_to_cart',     { id: p.id, name: p.nombre, price: p.precio, quantity: qty ?? 1 }),
  removeFromCart: (id, name) => track('remove_from_cart', { id, name }),
  wishlistAdd:    (p)        => track('wishlist_add',    { id: p.id, name: p.nombre }),
  wishlistRemove: (id)       => track('wishlist_remove', { id }),
  quickViewOpen:  (p)        => track('quick_view_open', { id: p.id, name: p.nombre }),
  searchQuery:    (q, count) => track('search_query',    { query: q, results: count }),
  checkoutStart:  (total, n) => track('checkout_start',  { total, item_count: n }),
  descubriStart:  (deckSize)     => track('descubri_start',  { deck_size: deckSize }),
  descubriSwipe:  (p, dir)       => track('descubri_swipe',  { id: p.id, name: p.nombre, price: p.precio, category: p.categoriaNombre, dir }),
  descubriFinish: (likes, seen)  => track('descubri_finish', { likes, seen }),
  descubriAddAll: (n, value)     => track('descubri_add_all', { item_count: n, value }),
}
