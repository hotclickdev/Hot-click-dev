import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { analytics } from '@/utils/analytics'
import type { ItemWishlist } from '@/types/carrito'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'

type WishlistState = {
  items: ItemWishlist[]
  toggle: (product: Producto) => void
  isLiked: (id: Id) => boolean
  count: () => number
  remove: (id: Id) => void
  updatePrice: (id: Id, newPrice: number) => void
}

const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: (product) => {
        const { items } = get()
        const exists = items.some((i) => i.id === product.id)
        if (!exists) {
          // Guardar solo los campos que WishlistPage necesita para renderizar
          const slim: ItemWishlist = {
            id: product.id as number,
            nombre: product.nombre,
            precio: product.precio,
            imagenUrl: product.imagenUrl,
            stock: product.stock ?? 0,
          }
          set({ items: [...items, slim] })
          analytics.wishlistAdd(product)
        } else {
          set({ items: items.filter((i) => i.id !== product.id) })
          if (product.id != null) analytics.wishlistRemove(product.id)
        }
      },

      isLiked: (id) => get().items.some((i) => i.id === id),

      count: () => get().items.length,

      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

      updatePrice: (id, newPrice) => set({
        items: get().items.map((i) => i.id === id ? { ...i, precio: newPrice } : i)
      }),
    }),
    { name: 'hotclick-wishlist' }
  )
)

export default useWishlistStore
