/**
 * Botones flotantes del sistema (WhatsApp y accesibilidad).
 *
 * Móvil (< lg): el botón de WhatsApp de 56 px queda a 16 px sobre la barra inferior de 67 px
 * (Figma `52:2418`: x 318, y 705 en un lienzo de 390 × 844) y a 16 px del borde derecho.
 * Desktop (>= lg): abajo a la derecha, sin barra inferior.
 */
export const ALTO_BARRA_INFERIOR = 67
export const SEPARACION_FLOTANTE = 16
export const TAMANO_WHATSAPP = 56

/** Ficha de producto: en móvil la barra de compra (83 px) ocupa el borde inferior. */
export function esFichaProducto(pathname: string): boolean {
  return /^\/productos\/[^/]+/.test(pathname)
}

/** Rutas donde el botón de WhatsApp no se muestra (auth, carrito, pago, paneles, tienda del vendedor, prototipo). */
export function whatsappOculto(pathname: string, esTienda: boolean, esPrototipo: boolean): boolean {
  if (['/login', '/registro', '/carrito', '/checkout'].includes(pathname)) return true
  if (pathname.startsWith('/admin') || pathname.startsWith('/checkout') || pathname.startsWith('/pago')) return true
  if (pathname.startsWith('/pos')) return true
  return esTienda || esPrototipo
}
