import { beforeEach, describe, expect, it } from 'vitest'
import useCartStore from './cartStore'
import type { Producto } from '@/types/producto'

// M-01 (front): el carrito suma el mismo precio efectivo que cobra el backend.
const base = { id: 621, nombre: 'Prod', stock: 10, precio: 8900, precioVenta: 8900 }
const prod = (extra: Record<string, unknown>) => ({ ...base, ...extra }) as unknown as Producto

describe('cartStore — precio de oferta', () => {
  beforeEach(() => useCartStore.getState().clearCart())

  it('usa precioEfectivo del backend cuando viene en el JSON', () => {
    useCartStore.getState().addItem(prod({ enOferta: true, precioOferta: 7900, precioEfectivo: 7900 }), 2)
    expect(useCartStore.getState().total()).toBe(15800)
    expect(useCartStore.getState().items[0].precio).toBe(7900)
  })

  it('sin precioEfectivo aplica la misma regla: oferta activa y 0 < oferta < normal', () => {
    useCartStore.getState().addItem(prod({ enOferta: true, precioOferta: 7900 }), 1)
    expect(useCartStore.getState().total()).toBe(7900)
  })

  it('oferta apagada, ≥ normal o ≤ 0 → precio normal', () => {
    useCartStore.getState().addItem(prod({ id: 1, enOferta: false, precioOferta: 7900 }), 1)
    useCartStore.getState().addItem(prod({ id: 2, enOferta: true, precioOferta: 9900 }), 1)
    useCartStore.getState().addItem(prod({ id: 3, enOferta: true, precioOferta: 0 }), 1)
    expect(useCartStore.getState().total()).toBe(8900 * 3)
  })

  it('un carrito guardado con precio de lista se recalcula al total efectivo', () => {
    useCartStore.setState({ items: [{ ...prod({ enOferta: true, precioOferta: 7900 }), cantidad: 2 }] as never })
    expect(useCartStore.getState().total()).toBe(15800)
  })
})
