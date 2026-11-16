import { describe, expect, it } from 'vitest'
import { MAX_LINEAS_CARRITO, MENSAJE_MAX_LINEAS_CARRITO } from '@/store/cartStore'
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
  it('usa las constantes compartidas del carrito (PR 553)', () => {
    expect(MAX_LINEAS_POS).toBe(MAX_LINEAS_CARRITO)
    expect(MENSAJE_MAX_LINEAS_POS).toBe(MENSAJE_MAX_LINEAS_CARRITO)
    expect(MENSAJE_MAX_LINEAS_POS).toBe(`El pedido no puede tener más de ${MAX_LINEAS_CARRITO} productos distintos`)
  })

  it('agrega la última línea permitida', () => {
    const r = agregarProductoAlCarrito(carrito(MAX_LINEAS_CARRITO - 1), { id: 999, nombre: 'X', precioVenta: 1 } as never)
    expect(r).toHaveLength(MAX_LINEAS_CARRITO)
  })

  it('rechaza la línea siguiente al tope y devuelve el carrito intacto', () => {
    const prev = carrito(MAX_LINEAS_CARRITO)
    const p = { id: 999, nombre: 'X', precioVenta: 1 } as never
    expect(excedeTopeLineasPos(prev, p)).toBe(true)
    expect(agregarProductoAlCarrito(prev, p)).toBe(prev)
  })

  it('con el carrito lleno sigue permitiendo sumar cantidad a una existente', () => {
    const r = agregarProductoAlCarrito(carrito(MAX_LINEAS_CARRITO), { id: 3, nombre: 'P3', precioVenta: 100 } as never)
    expect(r).toHaveLength(MAX_LINEAS_CARRITO)
    expect(r.find(i => i.id === 3)?.cantidad).toBe(2)
  })

  it('excedeTopeLineasPos: con el carrito lleno, un producto que ya está en el carrito NO excede', () => {
    const prev = carrito(MAX_LINEAS_CARRITO)
    expect(excedeTopeLineasPos(prev, { id: 3, nombre: 'P3', precioVenta: 100 } as never)).toBe(false)
  })

  it('excedeTopeLineasPos: con una línea menos que el tope, un producto nuevo no excede', () => {
    expect(excedeTopeLineasPos(carrito(MAX_LINEAS_CARRITO - 1), { id: 999, nombre: 'X', precioVenta: 1 } as never)).toBe(false)
  })
})
