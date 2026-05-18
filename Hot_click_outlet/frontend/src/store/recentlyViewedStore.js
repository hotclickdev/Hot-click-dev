import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_ITEMS = 6

const useRecentlyViewedStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const filtered = get().items.filter((i) => i.id !== product.id)
        set({ items: [product, ...filtered].slice(0, MAX_ITEMS) })
      },
    }),
    { name: 'hotclick-recently-viewed' }
  )
)

export default useRecentlyViewedStore
