export type ModoPrecioPersonalizado = 'FIJO' | 'RANGO' | 'COTIZACION'

export const MODOS_PRECIO_PERSONALIZADO: ReadonlyArray<{
  valor: ModoPrecioPersonalizado
  titulo: string
  ayuda: string
}> = [
  { valor: 'FIJO', titulo: 'Precio fijo', ayuda: 'El cliente paga de una vez.' },
  { valor: 'RANGO', titulo: 'Rango', ayuda: 'Mostrás desde–hasta y cotizás dentro del rango.' },
  { valor: 'COTIZACION', titulo: 'Cotización', ayuda: 'Sin precio público: revisás y cotizás después.' },
]

/** Precio de venta a persistir según modo personalizado. */
export function precioVentaPersonalizado(
  personalizado: boolean,
  modo: ModoPrecioPersonalizado,
  venta: string,
  precioMin: string,
): string {
  if (!personalizado) return venta
  if (modo === 'COTIZACION') return venta || '1'
  if (modo === 'RANGO') return precioMin || '1'
  return venta
}

export function tituloFormProducto(editar: boolean, personalizado: boolean): string {
  if (editar) return 'Editar Producto'
  if (personalizado) return 'Producto personalizado'
  return 'Nuevo Producto'
}
