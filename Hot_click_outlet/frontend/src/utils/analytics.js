// Adapter-pattern analytics layer.
// Add adapters (GA4, Mixpanel, etc.) via addAdapter().
// Console adapter active in dev by default.

const _adapters = []

export function addAdapter(fn) {
  _adapters.push(fn)
}

function track(event, payload = {}) {
  const data = { ...payload, timestamp: Date.now() }
  _adapters.forEach((fn) => {
    try { fn(event, data) } catch (_) {}
  })
}

// Dev adapter — logs to console grouped by event name
if (import.meta.env.DEV) {
  addAdapter((event, data) => {
    console.groupCollapsed(`%c[HC Analytics] ${event}`, 'color:#4f7cff;font-weight:bold;font-size:11px')
    console.log(data)
    console.groupEnd()
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
}
