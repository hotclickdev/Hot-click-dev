import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { analytics } from '@/utils/analytics'

const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],

      toggle: (product) => {
        const { items } = get()
        const exists = items.some((i) => i.id === product.id)
        set({ items: exists ? items.filter((i) => i.id !== product.id) : [...items, product] })
        if (exists) analytics.wishlistRemove(product.id)
        else analytics.wishlistAdd(product)
      },

      isLiked: (id) => get().items.some((i) => i.id === id),

      count: () => get().items.length,

      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
    }),
    { name: 'hotclick-wishlist' }
  )
)

export default useWishlistStore
