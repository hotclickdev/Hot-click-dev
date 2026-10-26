import { describe, expect, it } from 'vitest'
import {
  bodegaRetiroDePaquete,
  cantidadEmprendimientos,
  opcionesEnvio,
  paquetesDesdeItems,
  PAQUETE_SIN_BODEGA,
  bodegaIdReal,
} from './checkoutHelpers'
import type { ItemCheckout } from './checkoutHelpers'

const itemBodegaA: ItemCheckout = {
  id: 1,
  cantidad: 2,
  precio: 1000,
  bodegaId: 'A',
  bodegaNombre: 'Tienda A',
  bodegaPermiteRetiro: true,
  empresaNombre: 'Empresa A',
}

const itemBodegaB: ItemCheckout = {
  id: 2,
  cantidad: 1,
  precio: 5000,
  bodegaId: 'B',
  bodegaNombre: 'Tienda B',
  bodegaPermiteRetiro: false,
  empresaNombre: 'Empresa B',
}

describe('paquetesDesdeItems', () => {
  it('un solo vendedor produce un único paquete — mismo comportamiento de siempre', () => {
    const paquetes = paquetesDesdeItems([itemBodegaA])
    expect(paquetes).toHaveLength(1)
    expect(paquetes[0].bodegaId).toBe('A')
    expect(paquetes[0].subtotal).toBe(2000)
  })

  it('agrupa el carrito en un paquete por bodega de origen — un vendedor, un paquete', () => {
    const paquetes = paquetesDesdeItems([itemBodegaA, itemBodegaB])
    expect(paquetes).toHaveLength(2)
    expect(paquetes.map((p) => p.bodegaId)).toEqual(['A', 'B'])
    expect(paquetes[0].subtotal).toBe(2000)
    expect(paquetes[1].subtotal).toBe(5000)
  })

  it('items sin bodegaId van a un paquete local sin bodega (no a la bodega 1)', () => {
    const itemSinBodega: ItemCheckout = { id: 3, cantidad: 1, precio: 100 }
    const paquetes = paquetesDesdeItems([itemSinBodega])
    expect(paquetes).toHaveLength(1)
    expect(paquetes[0].bodegaId).toBe(PAQUETE_SIN_BODEGA)
    expect(bodegaIdReal(paquetes[0].bodegaId)).toBeUndefined()
  })

  it('bodegaIdReal solo acepta enteros positivos', () => {
    expect(bodegaIdReal('7')).toBe(7)
    expect(bodegaIdReal(7)).toBe(7)
    for (const malo of [undefined, null, '', '0', '-1', '1.5', 'abc', PAQUETE_SIN_BODEGA]) {
      expect(bodegaIdReal(malo)).toBeUndefined()
    }
  })
})

describe('cantidadEmprendimientos', () => {
  it('cuenta 1 con un solo vendedor', () => {
    expect(cantidadEmprendimientos([itemBodegaA])).toBe(1)
  })

  it('cuenta 2+ cuando hay varios emprendimientos — dispara el aviso al comprador', () => {
    expect(cantidadEmprendimientos([itemBodegaA, itemBodegaB])).toBe(2)
  })
})

describe('bodegaRetiroDePaquete', () => {
  it('permite retiro solo si el paquete lo permite', () => {
    const [paqueteA, paqueteB] = paquetesDesdeItems([itemBodegaA, itemBodegaB])
    expect(bodegaRetiroDePaquete(paqueteA)).not.toBeNull()
    expect(bodegaRetiroDePaquete(paqueteB)).toBeNull()
  })
})

describe('opcionesEnvio — encomienda', () => {
  it('la encomienda cuesta 0 para HotClick pero se marca "varía" (la cobra el transportista)', () => {
    const encomienda = opcionesEnvio(null).find((o) => o.value === 'ENCOMIENDA_PROPIA')
    expect(encomienda?.precio).toBe(0)
    expect(encomienda?.varia).toBe(true)
  })
})
