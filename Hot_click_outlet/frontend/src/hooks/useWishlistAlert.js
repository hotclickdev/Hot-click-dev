import { useEffect } from 'react'
import useWishlistStore from '@/store/wishlistStore'
import { productService, normalizeProduct } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'

const LOW_STOCK = 3
const CHECK_KEY = 'hc-wishlist-alert-ts'
const INTERVAL_MS = 4 * 60 * 60 * 1000  // re-check every 4 h

export function useWishlistAlert() {
  const items = useWishlistStore((s) => s.items)
  const toast = useToast()

  useEffect(() => {
    if (!items.length) return

    const lastCheck = Number(localStorage.getItem(CHECK_KEY) ?? 0)
    if (Date.now() - lastCheck < INTERVAL_MS) return

    const ids = items.map((i) => i.id)

    Promise.all(ids.map((id) => productService.getById(id).catch(() => null)))
      .then((results) => {
        localStorage.setItem(CHECK_KEY, String(Date.now()))

        const lowStock = results
          .filter(Boolean)
          .map((r) => normalizeProduct(r.data ?? r))
          .filter((p) => p.stock > 0 && p.stock <= LOW_STOCK)

        if (!lowStock.length) return

        const names = lowStock.map((p) => p.nombre)
        const msg =
          names.length === 1
            ? `¡Quedan solo ${lowStock[0].stock} unidades de "${names[0]}" en tu lista de deseos!`
            : `${names.length} productos de tu lista de deseos tienen stock bajo.`

        toast({ message: msg, type: 'warning', duration: 7000 })
      })
      .catch(() => {})
  }, []) // run once on mount — interval guards re-checking
}
