import { useEffect, useRef } from 'react'
import useCartStore from '@/store/cartStore'
import {
  abandonedCartService,
  markAbandonedSent,
  wasAlreadySent,
} from '@/services/abandonedCartService'

const CHECK_INTERVAL_MS  = 60_000      // poll every 60 s
const STALE_THRESHOLD_MS = 60 * 60 * 1000  // 1 hour without changes

/**
 * Background watcher that auto-saves the cart to the backend
 * when it has been stale for at least 1 hour.
 *
 * Mount this once in a global, non-admin layout so it runs
 * for all public-facing pages.
 */
export function useAbandonedCart() {
  const items         = useCartStore((s) => s.items)
  const cartUpdatedAt = useCartStore((s) => s.cartUpdatedAt)

  // Keep refs in sync so the interval closure always reads latest values
  const itemsRef         = useRef(items)
  const cartUpdatedAtRef = useRef(cartUpdatedAt)
  useEffect(() => { itemsRef.current = items },         [items])
  useEffect(() => { cartUpdatedAtRef.current = cartUpdatedAt }, [cartUpdatedAt])

  useEffect(() => {
    const interval = setInterval(() => {
      const currentItems = itemsRef.current
      const updatedAt    = cartUpdatedAtRef.current

      if (!currentItems.length || !updatedAt) return

      const staleMs = Date.now() - updatedAt
      if (staleMs < STALE_THRESHOLD_MS) return

      if (wasAlreadySent(updatedAt)) return

      abandonedCartService
        .saveAbandonedCart(currentItems)
        .then(() => markAbandonedSent(updatedAt))
        .catch(() => { /* silently ignore — non-critical */ })
    }, CHECK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, []) // single interval for the lifetime of the component
}

export default useAbandonedCart
