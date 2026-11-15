import { beforeEach, describe, expect, it } from 'vitest'
import useCartStore, { MAX_LINEAS_CARRITO } from './cartStore'
import type { Producto } from '@/types/producto'

// Tope de 50 productos distintos: el backend (PaymentCheckoutRequest) rechaza más con 400.
const prod = (id: number, extra: Record<string, unknown> = {}) =>
  ({ id, nombre: `P${id}`, stock: 10, precio: 1000, precioVenta: 1000, ...extra }) as unknown as Producto

describe('cartStore — tope de productos distintos', () => {
  beforeEach(() => useCartStore.getState().clearCart())

  it('agrega hasta 50 productos distintos y rechaza el 51.º', () => {
    for (let i = 1; i <= MAX_LINEAS_CARRITO; i++) expect(useCartStore.getState().addItem(prod(i))).toBe(true)
    expect(useCartStore.getState().items).toHaveLength(50)
    expect(useCartStore.getState().addItem(prod(51))).toBe(false)
    expect(useCartStore.getState().items).toHaveLength(50)
  })

  it('con 50 líneas todavía se puede sumar cantidad a un producto que ya está', () => {
    for (let i = 1; i <= MAX_LINEAS_CARRITO; i++) useCartStore.getState().addItem(prod(i))
    expect(useCartStore.getState().addItem(prod(7), 2)).toBe(true)
    expect(useCartStore.getState().items.find((i) => i.id === 7)?.cantidad).toBe(3)
  })

  it('una línea personalizada nueva también respeta el tope', () => {
    for (let i = 1; i <= MAX_LINEAS_CARRITO; i++) useCartStore.getState().addItem(prod(i))
    const pers = prod(99, { personalizacion: { texto: 'x' } })
    expect(useCartStore.getState().addItem(pers)).toBe(false)
  })
})
