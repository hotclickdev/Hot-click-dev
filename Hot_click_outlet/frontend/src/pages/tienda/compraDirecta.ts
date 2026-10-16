import type { Id } from '@/types/api'
import type { ItemCarritoTienda } from '@/types/carrito'

/**
 * S1-16: «Comprar ahora» va directo al checkout con ese producto, sin tocar el carrito de la tienda.
 * La línea viaja en el estado de navegación (`location.state.compraDirecta`); si no está (por ejemplo,
 * tras recargar), el checkout usa el carrito como siempre.
 */
export type EstadoCompraDirecta = { compraDirecta?: ItemCarritoTienda }

export function lineaCompraDirecta(state: unknown): ItemCarritoTienda | null {
  const linea = (state as EstadoCompraDirecta | null | undefined)?.compraDirecta
  return linea && linea.producto && linea.cantidad > 0 ? linea : null
}

/** Líneas que se pagan: solo la compra directa si la hay; si no, el carrito completo. */
export function lineasCheckout(carrito: ItemCarritoTienda[], directa: ItemCarritoTienda | null): ItemCarritoTienda[] {
  return directa ? [directa] : carrito
}

export function totalLineas(lineas: ItemCarritoTienda[]): number {
  return lineas.reduce((s, i) => s + (i.producto.precio ?? 0) * i.cantidad, 0)
}

export function itemsPedido(lineas: ItemCarritoTienda[]): { productoId: Id; cantidad: number }[] {
  return lineas.map((i) => ({ productoId: i.producto.id as Id, cantidad: i.cantidad }))
}
