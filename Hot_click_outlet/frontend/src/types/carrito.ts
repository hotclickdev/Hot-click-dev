import type { Id } from './api'
import type { Producto } from './producto'

export type PersonalizacionCarrito = {
  imagenes: string[]
  notas?: string
  tallaSeleccionada?: string
  encargoToken?: string
  presupuestoTipo?: 'SIN_PRESUPUESTO' | 'RANGO'
  presupuestoMin?: string
  presupuestoMax?: string
}

export type ItemCarrito = Producto & {
  cantidad: number
  tallaSeleccionada?: string
  /** Clave única de línea: productos personalizados no se fusionan. */
  cartLineId?: string
  personalizacion?: PersonalizacionCarrito
}

export type ItemWishlist = {
  id: number
  nombre: string
  precio: number
  imagenUrl: string
  stock: number
}

export type ItemVisto = {
  id: number
  nombre: string
  precio: number
  imagenUrl: string
}

export type ItemCarritoAbandonado = {
  id?: Id
  productoId?: Id
  cantidad?: number
  precio?: number
  precioVenta?: number
  nombre?: string
  nombreProducto?: string
  imagenUrl?: string
  imagenPrincipalUrl?: string
}

export type ItemCarritoTienda = {
  producto: Producto
  cantidad: number
}
