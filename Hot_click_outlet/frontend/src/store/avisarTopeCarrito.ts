import { MENSAJE_MAX_LINEAS_CARRITO } from './cartStore'

/**
 * Si addItem devolvió false (tope de 50 líneas distintas), avisa al usuario y
 * devuelve false para que el llamador no muestre éxito ni abra la hoja.
 */
export function avisarSiTopeCarrito(agregado: boolean, avisar: (mensaje: string) => void): boolean {
  if (agregado) return true
  avisar(MENSAJE_MAX_LINEAS_CARRITO)
  return false
}
