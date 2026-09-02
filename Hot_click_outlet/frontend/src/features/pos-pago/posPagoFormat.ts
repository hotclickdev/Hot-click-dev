const fmtColones = new Intl.NumberFormat('es-CR')

export function formatColones(monto: number | undefined | null): string {
  return fmtColones.format(Math.max(0, monto ?? 0))
}

export function nombreItem(item: { nombre?: string; nombreProducto?: string }): string {
  return item.nombre ?? item.nombreProducto ?? 'Producto'
}
