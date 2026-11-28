import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { analytics } from '@/utils/analytics'
import type { ItemCarrito, PersonalizacionCarrito } from '@/types/carrito'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'
import { formatPrice } from '@/utils/format'
import { topeStock } from '@/utils/stock'
import { precioUnitarioEfectivo } from '@/utils/precioProducto'

/** M-01: la línea del carrito guarda el precio efectivo que cobra el backend. */
function conPrecioEfectivo<T extends Parameters<typeof precioUnitarioEfectivo>[0]>(item: T): T {
  return { ...item, precio: precioUnitarioEfectivo(item) }
}

/** Tope de productos distintos por pedido: igual que el backend (PaymentCheckoutRequest.MAX_ITEMS = 50). */
export const MAX_LINEAS_CARRITO = 50
export const MENSAJE_MAX_LINEAS_CARRITO = `El pedido no puede tener más de ${MAX_LINEAS_CARRITO} productos distintos`

type ProductoConExtras = Producto & {
  tallaSeleccionada?: string
  personalizacion?: PersonalizacionCarrito
  cartLineId?: string
}

type CartState = {
  items: ItemCarrito[]
  cartUpdatedAt: number | null
  /** false si no se agregó porque el carrito ya tiene MAX_LINEAS_CARRITO productos distintos. */
  addItem: (product: ProductoConExtras, qty?: number) => boolean
  removeItem: (id: Id, cartLineId?: string) => void
  updateQuantity: (id: Id, cantidad: number, cartLineId?: string) => void
  clearCart: () => void
  getCartItems: () => ItemCarrito[]
  total: () => number
  count: () => number
  toWhatsAppMessage: () => string
}

function mismaLinea(a: ItemCarrito, productId: Id, cartLineId?: string) {
  if (cartLineId) return a.cartLineId === cartLineId
  if (a.personalizacion || a.cartLineId) return false
  return a.id === productId
}

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      cartUpdatedAt: null,


      addItem: (product, qty = 1) => {
        const { items } = get()
        const esPersonalizado = Boolean(product.personalizacion) || product.esPersonalizado === true

        // Una línea nueva (personalizada, o producto que aún no está) no puede pasar del tope; sumar cantidad sí.
        const esLineaNueva = esPersonalizado && product.personalizacion
          ? true
          : !items.some((i) => mismaLinea(i, product.id as Id))
        if (esLineaNueva && items.length >= MAX_LINEAS_CARRITO) return false

        if (esPersonalizado && product.personalizacion) {
          const cartLineId = product.cartLineId ?? crypto.randomUUID()
          set({
            items: [
              ...items,
              {
                ...conPrecioEfectivo(product),
                cantidad: Math.min(qty, topeStock(product.stock)),
                cartLineId,
                personalizacion: product.personalizacion,
              },
            ],
            cartUpdatedAt: Date.now(),
          })
          analytics.addToCart(product)
          return true
        }

        const existing = items.find((i) => mismaLinea(i, product.id as Id))
        if (existing) {
          set({
            items: items.map((i) =>
              mismaLinea(i, product.id as Id)
                ? { ...i, cantidad: Math.min(i.cantidad + qty, topeStock(i.stock)) }
                : i
            ),
            cartUpdatedAt: Date.now(),
          })
        } else {
          set({
            items: [...items, { ...conPrecioEfectivo(product), cantidad: Math.min(qty, topeStock(product.stock)) }],
            cartUpdatedAt: Date.now(),
          })
        }
        analytics.addToCart(product)
        return true
      },

      removeItem: (id, cartLineId) => {
        const item = get().items.find((i) => mismaLinea(i, id, cartLineId))
        if (item) analytics.removeFromCart(id, item.nombre)
        set({
          items: get().items.filter((i) => !mismaLinea(i, id, cartLineId)),
          cartUpdatedAt: Date.now(),
        })
      },

      updateQuantity: (id, cantidad, cartLineId) => {
        if (cantidad < 1) return get().removeItem(id, cartLineId)
        set({
          items: get().items.map((i) =>
            mismaLinea(i, id, cartLineId)
              ? { ...i, cantidad: Math.min(cantidad, topeStock(i.stock)) }
              : i
          ),
          cartUpdatedAt: Date.now(),
        })
      },

      clearCart: () => set({ items: [], cartUpdatedAt: null }),

      getCartItems: () => get().items,

      total: () =>
        get().items.reduce((sum, i) => sum + precioUnitarioEfectivo(i) * i.cantidad, 0),

      count: () =>
        get().items.reduce((sum, i) => sum + i.cantidad, 0),

      toWhatsAppMessage: () => {
        const { items, total } = get()
        const lines = items.map((i) => {
          const talla = i.tallaSeleccionada || i.personalizacion?.tallaSeleccionada
          const pers = i.personalizacion ? ' [personalizado]' : ''
          return `  • ${i.nombre ?? i.nombreProducto}${talla ? ` (Talla ${talla})` : ''}${pers} x${i.cantidad} — ${formatPrice(precioUnitarioEfectivo(i) * i.cantidad)}`
        })
        const detalle = items.length
          ? `${lines.join('\n')}\n\nTotal: ${formatPrice(total())}\n\n`
          : ''
        return encodeURIComponent(
          `Hola HotClick, consulto sobre este pedido:\n\n${detalle}¿Me ayudan con una duda?`
        )
      },
    }),
    {
      name: 'hotclick-cart',
      // M-01: carritos guardados antes del fix tenían el precio de lista en `precio`.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CartState>
        return { ...current, ...p, items: (p.items ?? current.items).map(conPrecioEfectivo) }
      },
    },
  ),
)

export default useCartStore
