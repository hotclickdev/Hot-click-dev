import { describe, expect, it } from 'vitest'
import {
  MAX_LINEAS_POS,
  MENSAJE_MAX_LINEAS_POS,
  agregarProductoAlCarrito,
  excedeTopeLineasPos,
  type ItemCarritoPos,
} from './posHelpers'

const linea = (id: number): ItemCarritoPos => ({
  id, nombre: `P${id}`, imagen: null, precio: 100, precioOriginal: 100, stockActual: 5, cantidad: 1,
})
const carrito = (n: number) => Array.from({ length: n }, (_, i) => linea(i + 1))

describe('tope de líneas del POS', () => {
  it('es 50, igual que MAX_LINEAS_CARRITO del PR 553', () => {
    expect(MAX_LINEAS_POS).toBe(50)
    expect(MENSAJE_MAX_LINEAS_POS).toBe('El pedido no puede tener más de 50 productos distintos')
  })

  it('agrega la línea 50', () => {
    const r = agregarProductoAlCarrito(carrito(49), { id: 999, nombre: 'X', precioVenta: 1 } as never)
    expect(r).toHaveLength(50)
  })

  it('rechaza la línea 51 y devuelve el carrito intacto', () => {
    const prev = carrito(50)
    const p = { id: 999, nombre: 'X', precioVenta: 1 } as never
    expect(excedeTopeLineasPos(prev, p)).toBe(true)
    expect(agregarProductoAlCarrito(prev, p)).toBe(prev)
  })

  it('con 50 líneas sigue permitiendo sumar cantidad a una existente', () => {
    const r = agregarProductoAlCarrito(carrito(50), { id: 3, nombre: 'P3', precioVenta: 100 } as never)
    expect(r).toHaveLength(50)
    expect(r.find(i => i.id === 3)?.cantidad).toBe(2)
  })
})
