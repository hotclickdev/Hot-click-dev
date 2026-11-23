import { texto, type Fila } from './normalizar'

/** Línea de detalle de un negocio en revisión (sin datos personales: solo conteos y estado de la cuenta). */
export function metaRevision(fila: Fila): string {
  const productos = typeof fila.productosActivos === 'number' ? fila.productosActivos : 0
  const cuenta = texto(fila.cuentaOnvo) === 'ACTIVA' ? 'cuenta ONVO activa' : 'cuenta ONVO sin activar'
  return `${productos} ${productos === 1 ? 'producto activo' : 'productos activos'} · ${cuenta}`
}
