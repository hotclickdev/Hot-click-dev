import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { analytics } from '@/utils/analytics'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      // Timestamp of last cart modification — for abandoned cart analytics
      cartUpdatedAt: null,

      addItem: (product) => {
        const { items } = get()
        const existing = items.find((i) => i.id === product.id)
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === product.id
                ? { ...i, cantidad: Math.min(i.cantidad + 1, i.stock ?? 99) }
                : i
            ),
            cartUpdatedAt: Date.now(),
          })
        } else {
          set({ items: [...items, { ...product, cantidad: 1 }], cartUpdatedAt: Date.now() })
        }
        analytics.addToCart(product)
      },

      removeItem: (id) => {
        const item = get().items.find((i) => i.id === id)
        if (item) analytics.removeFromCart(id, item.nombre)
        set({ items: get().items.filter((i) => i.id !== id) })
      },

      updateQuantity: (id, cantidad) => {
        if (cantidad < 1) return get().removeItem(id)
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, cantidad } : i
          ),
        })
      },

      clearCart: () => set({ items: [] }),

      total: () =>
        get().items.reduce((sum, i) => sum + (i.precio ?? i.precioVenta ?? 0) * i.cantidad, 0),

      count: () =>
        get().items.reduce((sum, i) => sum + i.cantidad, 0),

      toWhatsAppMessage: () => {
        const { items, total } = get()
        const lines = items.map(
          (i) => `  • ${i.nombre ?? i.nombreProducto} x${i.cantidad} — ₡${((i.precio ?? i.precioVenta ?? 0) * i.cantidad).toLocaleString('es-CR')}`
        )
        return encodeURIComponent(
          `Hola Andrés! 👋 Me interesa hacer el siguiente pedido:\n\n` +
          `${lines.join('\n')}\n\n` +
          `💰 *Total: ₡${total().toLocaleString('es-CR')}*\n\n` +
          `¿Está disponible? ¿Cuál es el tiempo de entrega y cómo puedo pagar? Gracias 😊`
        )
      },
    }),
    {
      name: 'hotclick-cart',
    }
  )
)

export default useCartStore
