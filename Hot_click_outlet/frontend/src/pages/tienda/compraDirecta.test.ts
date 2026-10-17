import { describe, expect, it } from 'vitest'
import type { ItemCarritoTienda } from '@/types/carrito'
import type { Producto } from '@/types/producto'
import { itemsPedido, lineaCompraDirecta, lineasCheckout, totalLineas } from './compraDirecta'

const p = (id: number, precio: number) => ({ id, nombre: `P${id}`, precio }) as unknown as Producto

describe('S1-16 «Comprar ahora» no deja el producto en el carrito', () => {
  it('con carrito vacío, el checkout paga solo la línea directa y el carrito sigue vacío', () => {
    const carrito: ItemCarritoTienda[] = []
    const directa = lineaCompraDirecta({ compraDirecta: { producto: p(1, 1000), cantidad: 2 } })
    const lineas = lineasCheckout(carrito, directa)
    expect(itemsPedido(lineas)).toEqual([{ productoId: 1, cantidad: 2 }])
    expect(totalLineas(lineas)).toBe(2000)
    expect(carrito).toEqual([])
  })

  it('con otros productos en el carrito, la compra directa no los incluye ni los cambia', () => {
    const carrito: ItemCarritoTienda[] = [{ producto: p(5, 300), cantidad: 1 }]
    const copia = structuredClone(carrito)
    const lineas = lineasCheckout(carrito, lineaCompraDirecta({ compraDirecta: { producto: p(1, 1000), cantidad: 1 } }))
    expect(itemsPedido(lineas)).toEqual([{ productoId: 1, cantidad: 1 }])
    expect(carrito).toEqual(copia)
  })

  it('sin estado de compra directa, el checkout usa el carrito', () => {
    const carrito: ItemCarritoTienda[] = [{ producto: p(5, 300), cantidad: 2 }]
    expect(lineaCompraDirecta(null)).toBeNull()
    expect(lineaCompraDirecta({ compraDirecta: { producto: p(1, 1), cantidad: 0 } })).toBeNull()
    expect(lineasCheckout(carrito, null)).toBe(carrito)
    expect(totalLineas(carrito)).toBe(600)
  })
})
