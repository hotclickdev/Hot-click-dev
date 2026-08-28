import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import useWishlistStore from '@/store/wishlistStore'
import { productService, normalizeProduct } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'
import type { ItemWishlist } from '@/types/carrito'
import type { Id } from '@/types/api'
import type { Producto, ProductoBackend } from '@/types/producto'

const findById = (list: ItemWishlist[], id: Id | undefined) => list.find((i) => i.id === id)

const LOW_STOCK = 3
const CHECK_KEY = 'hc-wishlist-alert-ts'
const INTERVAL_MS = 4 * 60 * 60 * 1000  // re-check every 4 h
const BLOCKED_PATHS = ['/checkout', '/pago/', '/carrito', '/login', '/registro']

export function useWishlistAlert() {
  const items = useWishlistStore((s) => s.items)
  const updatePrice = useWishlistStore((s) => s.updatePrice)
  const toast = useToast()
  const { pathname } = useLocation()

  useEffect(() => {
    if (BLOCKED_PATHS.some((p) => pathname.startsWith(p))) return
    if (!items.length) return

    const lastCheck = Number(localStorage.getItem(CHECK_KEY) ?? 0)
    if (Date.now() - lastCheck < INTERVAL_MS) return

    Promise.all(items.map((i) => productService.getById(i.id).catch(() => null)))
      .then((results) => {
        localStorage.setItem(CHECK_KEY, String(Date.now()))

        const fresh = results
          .filter((r): r is NonNullable<typeof r> => Boolean(r))
          .map((r) => {
            const crudo: unknown = r.data ?? r
            return normalizeProduct(crudo as ProductoBackend)
          }) as Producto[]

        // ── Stock bajo ──
        const lowStock = fresh.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK)
        if (lowStock.length === 1) {
          toast({
            message: `¡Solo quedan ${lowStock[0].stock} unidades de "${lowStock[0].nombre}"!`,
            type: 'warning',
            duration: 7000,
          })
        } else if (lowStock.length > 1) {
          toast({
            message: `${lowStock.length} productos de tu wishlist tienen stock bajo.`,
            type: 'warning',
            duration: 7000,
          })
        }

        // ── Bajada de precio ──
        for (const current of fresh) {
          const saved = findById(items, current.id)
          if (!saved || !current.precio) continue
          const drop = saved.precio - current.precio
          if (drop >= 1000) {
            toast({
              message: `¡Bajó el precio! "${current.nombre}" pasó de ${formatPrice(saved.precio)} a ${formatPrice(current.precio)}`,
              type: 'success',
              duration: 9000,
            })
            updatePrice(current.id as Id, current.precio)
          }
        }
      })
      .catch((err: unknown) => { console.error('[useWishlistAlert] check', err) })
  }, []) // run once on mount — interval guards re-checking
}
