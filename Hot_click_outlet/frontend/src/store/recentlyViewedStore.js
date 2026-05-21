import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_ITEMS = 6

const useRecentlyViewedStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const filtered = get().items.filter((i) => i.id !== product.id)
        // Guardar solo los campos que los componentes necesitan para renderizar
        const slim = {
          id: product.id,
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
