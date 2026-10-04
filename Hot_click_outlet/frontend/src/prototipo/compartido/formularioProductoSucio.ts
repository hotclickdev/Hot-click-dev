/** Hay datos escritos: el ✕ del wizard pide confirmación. */
export function formularioProductoSucio(valores: {
  nombre?: string
  compra?: string
  venta?: string
  descripcion?: string
  stock?: string
  categoriaId?: string
  instrucciones?: string
  imagenUrl?: string
  precioMin?: string
  precioMax?: string
}): boolean {
  return [
    valores.nombre,
    valores.compra,
    valores.venta,
    valores.descripcion,
    valores.stock,
    valores.categoriaId,
    valores.instrucciones,
    valores.imagenUrl,
    valores.precioMin,
    valores.precioMax,
  ].some((v) => Boolean(v?.trim()))
}
