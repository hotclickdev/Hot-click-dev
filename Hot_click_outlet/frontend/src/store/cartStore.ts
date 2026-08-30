import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { analytics } from '@/utils/analytics'
import type { ItemCarrito } from '@/types/carrito'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'

type CartState = {
  items: ItemCarrito[]
  cartUpdatedAt: number | null
  addItem: (product: Producto, qty?: number) => void
  removeItem: (id: Id) => void
  updateQuantity: (id: Id, cantidad: number) => void
  clearCart: () => void
  getCartItems: () => ItemCarrito[]
  total: () => number
  count: () => number
  toWhatsAppMessage: () => string
}

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      // Timestamp of last cart modification — for abandoned cart analytics
      cartUpdatedAt: null,

      addItem: (product, qty = 1) => {
        const { items } = get()
        const existing = items.find((i) => i.id === product.id)
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === product.id
                ? { ...i, cantidad: Math.min(i.cantidad + qty, i.stock ?? 99) }
                : i
            ),
            cartUpdatedAt: Date.now(),
          })
        } else {
          set({ items: [...items, { ...product, cantidad: Math.min(qty, product.stock ?? 99) }], cartUpdatedAt: Date.now() })
        }
        analytics.addToCart(product)
      },

      removeItem: (id) => {
        const item = get().items.find((i) => i.id === id)
        if (item) analytics.removeFromCart(id, item.nombre)
        set({ items: get().items.filter((i) => i.id !== id), cartUpdatedAt: Date.now() })
      },

      updateQuantity: (id, cantidad) => {
        if (cantidad < 1) return get().removeItem(id)
        set({
          items: get().items.map((i) => i.id === id ? { ...i, cantidad: Math.min(cantidad, i.stock ?? 99) } : i),
          cartUpdatedAt: Date.now(),
        })
      },

      clearCart: () => set({ items: [], cartUpdatedAt: null }),

      getCartItems: () => get().items,

      total: () =>
        get().items.reduce((sum, i) => sum + (i.precio ?? i.precioVenta ?? 0) * i.cantidad, 0),

      count: () =>
        get().items.reduce((sum, i) => sum + i.cantidad, 0),

      toWhatsAppMessage: () => {
        const { items, total } = get()
        const lines = items.map(
          (i) => `  • ${i.nombre ?? i.nombreProducto}${i.tallaSeleccionada ? ` (Talla ${i.tallaSeleccionada})` : ''} x${i.cantidad} — ₡${((i.precio ?? i.precioVenta ?? 0) * i.cantidad).toLocaleString('es-CR')}`
        )
        const detalle = items.length
          ? `${lines.join('\n')}\n\nTotal: ₡${total().toLocaleString('es-CR')}\n\n`
          : ''
        return encodeURIComponent(
          `Hola HotClick, consulto sobre este pedido:\n\n${detalle}¿Me ayudan con una duda?`
        )
      },
    }),
    {
      name: 'hotclick-cart',
    }
  )
)

export default useCartStore
