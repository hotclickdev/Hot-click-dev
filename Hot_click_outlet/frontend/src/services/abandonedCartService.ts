import api from './api'
import type { Id } from '@/types/api'
import type { ItemCarritoAbandonado } from '@/types/carrito'

const SESSION_KEY   = 'hc-session-id'
const SENT_TS_KEY   = 'hc-abandoned-sent-ts'

export function getOrCreateSessionId() {
  let sid = localStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : (crypto.getRandomValues(new Uint32Array(2))[0].toString(36) + Date.now().toString(36))
    localStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

export function markAbandonedSent(cartUpdatedAt: number) {
  localStorage.setItem(SENT_TS_KEY, String(cartUpdatedAt))
}

export function wasAlreadySent(cartUpdatedAt: number) {
  return localStorage.getItem(SENT_TS_KEY) === String(cartUpdatedAt)
}

export const abandonedCartService = {
  /**
   * Saves the current cart as abandoned.
   * items: array of { productoId, cantidad, precio, nombre, imagenUrl }
   */
  saveAbandonedCart: (items: ItemCarritoAbandonado[], email: string | null = null) => {
    const sessionId = getOrCreateSessionId()
    const payload = items.map((i) => ({
      productoId: i.id ?? i.productoId,
      cantidad:   i.cantidad ?? 1,
      precio:     i.precio ?? i.precioVenta ?? 0,
      nombre:     i.nombre ?? i.nombreProducto ?? '',
      imagenUrl:  i.imagenUrl ?? i.imagenPrincipalUrl ?? '',
    }))
    return api.post('/cart/abandoned', { items: payload, email, sessionId })
  },

  /** Fetches items for a recovery page (opened from email link). */
  getAbandonedCart: (token: string) =>
    api.get(`/cart/abandoned/recover/${encodeURIComponent(token)}`),

  /** Checks whether there is a PENDIENTE cart for the current session. */
  getAbandonedCartBySession: () => {
    const sessionId = getOrCreateSessionId()
    return api.get(`/cart/abandoned/session/${sessionId}`)
  },

  /** Deletes the record after the user restores or discards the cart. */
  deleteAbandonedCart: (id: Id) => {
    const sessionId = getOrCreateSessionId()
    return api.delete(`/cart/abandoned/${id}`, { params: { sessionId } })
  },

  /** Descarta el carrito recuperado con el token del email. */
  deleteAbandonedCartByToken: (token: string) =>
    api.delete(`/cart/abandoned/recover/${encodeURIComponent(token)}`),
}
