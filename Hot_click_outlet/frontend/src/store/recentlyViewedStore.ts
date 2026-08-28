import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ItemVisto } from '@/types/carrito'
import type { Producto } from '@/types/producto'

const MAX_ITEMS = 6

type RecentlyViewedState = {
  items: ItemVisto[]
  addItem: (product: Producto) => void
}

const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const filtered = get().items.filter((i) => i.id !== product.id)
        // Guardar solo los campos que los componentes necesitan para renderizar
        const slim: ItemVisto = {
          id: product.id as number,
          nombre: product.nombre,
          precio: product.precio,
          imagenUrl: product.imagenUrl,
        }
        set({ items: [slim, ...filtered].slice(0, MAX_ITEMS) })
      },
    }),
    { name: 'hotclick-recently-viewed' }
  )
)

export default useRecentlyViewedStore
