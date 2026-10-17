import { beforeEach, describe, expect, it } from 'vitest'
import useAuthStore from '@/store/authStore'
import useTiendaStore from '@/store/tiendaStore'
import type { Producto } from '@/types/producto'
import {
  TOPE_UNIDADES_INVITADO, limitarCantidadInvitado, llegoAlTopeInvitado, maxCantidadTienda, mensajeTopeInvitado,
} from './topeInvitado'

const producto = { id: 7, nombre: 'Taza', precio: 1000, stock: 10 } as unknown as Producto

describe('tope de unidades del invitado (GuestCheckoutGuard)', () => {
  beforeEach(() => {
    useTiendaStore.setState({ carrito: [] })
    useAuthStore.setState({ token: null })
  })

  it('usa el mismo default que el backend', () => {
    expect(TOPE_UNIDADES_INVITADO).toBe(3)
  })

  it('el invitado elige hasta 3 aunque haya más stock; con sesión, hasta el stock', () => {
    expect(maxCantidadTienda(10, true)).toBe(3)
    expect(maxCantidadTienda(2, true)).toBe(2)
    expect(maxCantidadTienda(10, false)).toBe(10)
    expect(limitarCantidadInvitado(5, true)).toBe(3)
    expect(limitarCantidadInvitado(5, false)).toBe(5)
  })

  it('avisa al llegar al tope, no cuando el límite es el stock', () => {
    expect(llegoAlTopeInvitado(3, 10, true)).toBe(true)
    expect(llegoAlTopeInvitado(2, 10, true)).toBe(false)
    expect(llegoAlTopeInvitado(2, 2, true)).toBe(false)
    expect(llegoAlTopeInvitado(3, 10, false)).toBe(false)
    expect(mensajeTopeInvitado()).toBe(
      'Como invitado podés reservar hasta 3 unidades de un mismo producto. Iniciá sesión para comprar más.',
    )
  })

  it('el carrito de la tienda no pasa de 3 unidades sin sesión, aunque se agregue dos veces', () => {
    const { agregarAlCarrito, actualizarCantidad } = useTiendaStore.getState()
    agregarAlCarrito(producto, 3)
    agregarAlCarrito(producto, 2)
    expect(useTiendaStore.getState().carrito[0].cantidad).toBe(3)
    actualizarCantidad(7, 8)
    expect(useTiendaStore.getState().carrito[0].cantidad).toBe(3)
  })

  it('con sesión no aplica el tope del invitado', () => {
    useAuthStore.setState({ token: 'x' })
    useTiendaStore.getState().agregarAlCarrito(producto, 5)
    expect(useTiendaStore.getState().carrito[0].cantidad).toBe(5)
  })
})

describe('tope desde GET /api/public/checkout-config', () => {
  it('usa maxUnidadesPorProducto si viene y 3 de respaldo si no', async () => {
    const { topeDesdeConfig, TOPE_UNIDADES_INVITADO, useTopeInvitadoStore, maxCantidadTienda, mensajeTopeInvitado } = await import('./topeInvitado')
    expect(topeDesdeConfig({ maxUnidadesPorProducto: 5 })).toBe(5)
    expect(topeDesdeConfig({ data: { maxUnidadesPorProducto: 2 } })).toBe(2)
    expect(topeDesdeConfig({})).toBe(TOPE_UNIDADES_INVITADO)
    expect(topeDesdeConfig({ maxUnidadesPorProducto: 0 })).toBe(3)
    expect(topeDesdeConfig(null)).toBe(3)
    useTopeInvitadoStore.setState({ tope: 5 })
    expect(maxCantidadTienda(10, true)).toBe(5)
    expect(mensajeTopeInvitado()).toContain('hasta 5 unidades')
    useTopeInvitadoStore.setState({ tope: 3 })
  })
})
