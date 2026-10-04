/**
 * Botón flotante del sistema (WhatsApp). El de accesibilidad con el isotipo se retiró: ahora se abre desde el pie.
 *
 * Móvil con barra inferior: 56 px a 16 px sobre la barra de 67 px
 * (Figma `52:2418`: x 318, y 705 en un lienzo de 390 × 844) y a 16 px del borde derecho.
 * Móvil sin barra: el mismo margen de 16 px del borde (nota `52:2422`); no hay frame propio.
 * Desktop (>= lg): abajo a la derecha, margen 16 px, sin barra inferior.
 */
/** WhatsApp de soporte de HotClick (el mismo del pie y de Contacto). */
export const WHATSAPP_HOTCLICK = '50686667888'

/**
 * Landings de planes (`/emprende`, `/para-pymes`, `/negocio-plus-plan`): en celular el botón flotante tapaba la
 * foto del inicio y la barra, así que ahí va dentro de la página (pedido de HOT_CLICK, 3-oct-2026).
 */
export function esLandingPlan(pathname: string): boolean {
  return ['/emprende', '/para-pymes', '/negocio-plus-plan'].includes(pathname.replace(/\/$/, '') || '/')
}

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
 * Con barra y botón visible, 155 px (barra + botón + márgenes): ni el texto legal ni la última fila de
 * tarjetas quedan bajo el botón (R5, 2-oct-2026; antes, sin pie móvil, solo se reservaban 72 px).
 * Con barra y sin botón, se conserva el hueco de 72 px.
 * Sin barra y con el botón visible, 88 px. Si el botón no está, no hay hueco extra.
 */
export function espacioReservadoMovil({ hayBarra, fabVisible }: EspacioFlotante): number | null {
  if (hayBarra && fabVisible) return ESPACIO_BAJO_PIE_MOVIL
  if (hayBarra) return ESPACIO_BAJO_BARRA
  if (fabVisible) return ESPACIO_SIN_BARRA
  return null
}

/**
 * Pantallas de rol o de captación de vendedores: fuera del alcance de la alineación del visitante, el botón
 * conserva ahí su comportamiento anterior (visible salvo las exclusiones de siempre).
 */
const PREFIJOS_SIN_CAMBIO = [
  '/emprendedor', '/pyme', '/negocio-plus', '/seleccionar-negocio', '/mode-select', '/registrar-negocio',
  '/registro-empresa', '/emprende', '/para-emprendedores', '/para-pymes', '/visitante',
]

function esRutaSinCambio(pathname: string): boolean {
  return PREFIJOS_SIN_CAMBIO.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}-`))
}

/**
 * Pantalla del visitante/comprador (marketplace y tienda pública): no es panel (`/admin`, `/pos`, roles),
 * ni landing de vendedor, ni prototipo. Sirve para variantes ⚠️ COMPARTIDAS que solo cambian para el visitante.
 */
export function esRutaVisitante(pathname: string, esPrototipo = false): boolean {
  if (esPrototipo) return false
  if (pathname.startsWith('/admin') || pathname.startsWith('/pos')) return false
  return !esRutaSinCambio(pathname)
}

/**
 * Rutas donde el botón de WhatsApp no se muestra (auth, carrito, pago, paneles, tienda del vendedor, prototipo).
 * `/sin-conexion` no está en el frame `45:2264`. En `/` el Home normal sigue visible: la pantalla sin conexión
 * se señala aparte, porque esa ruta también es el Home con datos.
 * Visitante (2-oct-2026): Figma solo lo dibuja en el Home (`51:2262`), así que en el resto de las pantallas
 * del comprador no aparece. El WhatsApp de HotClick sigue en Contacto y en el pie.
 */
export function whatsappOculto(
  pathname: string,
  esTienda: boolean,
  esPrototipo: boolean,
  pantallaSinConexion = false,
): boolean {
  if (pantallaSinConexion || pathname === '/sin-conexion') return true
  if (['/login', '/registro', '/carrito', '/checkout'].includes(pathname)) return true
  if (pathname.startsWith('/admin') || pathname.startsWith('/checkout') || pathname.startsWith('/pago')) return true
  if (pathname.startsWith('/pos')) return true
  if (esTienda || esPrototipo) return true
  if (esRutaSinCambio(pathname)) return false
  return pathname !== '/'
}
