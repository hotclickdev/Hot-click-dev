/**
 * Botón flotante del sistema (WhatsApp). El de accesibilidad con el isotipo se retiró: ahora se abre desde el pie.
 *
 * Móvil con barra inferior: 56 px a 16 px sobre la barra de 67 px
 * (Figma `52:2418`: x 318, y 705 en un lienzo de 390 × 844) y a 16 px del borde derecho.
 * Móvil sin barra: el mismo margen de 16 px del borde (nota `52:2422`); no hay frame propio.
 * Desktop (>= lg): abajo a la derecha, margen 16 px, sin barra inferior.
 */
export const ALTO_BARRA_INFERIOR = 67
export const SEPARACION_FLOTANTE = 16
export const TAMANO_WHATSAPP = 56

/** Hueco bajo el contenido cuando hay barra y no hay pie móvil. Ya existía (72 px). */
export const ESPACIO_BAJO_BARRA = 72

/** Pie móvil + barra: el botón fijo cabe entre el texto legal y la barra, con 16 px a cada lado. */
export const ESPACIO_BAJO_PIE_MOVIL = ALTO_BARRA_INFERIOR + SEPARACION_FLOTANTE + TAMANO_WHATSAPP + SEPARACION_FLOTANTE

/** Sin barra: el botón queda a 16 px del borde y el último control puede subir por encima. */
export const ESPACIO_SIN_BARRA = SEPARACION_FLOTANTE + TAMANO_WHATSAPP + SEPARACION_FLOTANTE

/** Ficha de producto: en móvil la barra de compra (83 px) ocupa el borde inferior. */
export function esFichaProducto(pathname: string): boolean {
  return /^\/productos\/[^/]+/.test(pathname)
}

/** 83 px con barra (Figma); 16 px si la pantalla no tiene barra inferior. */
export function bottomWhatsappPx(hayBarra: boolean): number {
  return hayBarra ? ALTO_BARRA_INFERIOR + SEPARACION_FLOTANTE : SEPARACION_FLOTANTE
}

type EspacioFlotante = {
  hayBarra: boolean
  hayPieMovil: boolean
  fabVisible: boolean
}

/**
 * Alto del spacer móvil al final del documento.
 * Con pie y barra, 155 px para que el texto legal no quede bajo el botón.
 * Con barra y sin pie, se conserva el hueco de 72 px.
 * Sin barra y con el botón visible, 88 px. Si el botón no está, no hay hueco extra.
 */
export function espacioReservadoMovil({ hayBarra, hayPieMovil, fabVisible }: EspacioFlotante): number | null {
  if (hayBarra && hayPieMovil && fabVisible) return ESPACIO_BAJO_PIE_MOVIL
  if (hayBarra) return ESPACIO_BAJO_BARRA
  if (fabVisible) return ESPACIO_SIN_BARRA
  return null
}

/** Rutas donde el botón de WhatsApp no se muestra (auth, carrito, pago, paneles, tienda del vendedor, prototipo). */
export function whatsappOculto(pathname: string, esTienda: boolean, esPrototipo: boolean): boolean {
  if (['/login', '/registro', '/carrito', '/checkout'].includes(pathname)) return true
  if (pathname.startsWith('/admin') || pathname.startsWith('/checkout') || pathname.startsWith('/pago')) return true
  if (pathname.startsWith('/pos')) return true
  return esTienda || esPrototipo
}
