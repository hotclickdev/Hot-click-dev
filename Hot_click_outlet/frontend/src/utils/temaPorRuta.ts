/**
 * Rutas del panel (admin / vendedor / caja) pueden usar el tema del usuario.
 * El resto de la app (marketplace, login, tienda pública, pago QR…) fuerza claro
 * para no romper contraste ni flujos de cliente.
 *
 * `html.high-contrast` es ortogonal: se aplica desde uiStore aunque la ruta
 * fuerce light (la preferencia dark queda en store para al volver al panel).
 */
const PREFIJOS_PANEL = [
  '/admin',
  '/emprendedor',
  '/pyme',
  '/negocio-plus',
] as const

/** True si la ruta puede seguir `html.dark` del usuario. */
export function esRutaTemaPanel(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/'
  return PREFIJOS_PANEL.some(
    (prefijo) => path === prefijo || path.startsWith(`${prefijo}/`),
  )
}

/** Tema efectivo a aplicar en `<html>` (no muta la preferencia guardada). */
export function temaEfectivoParaRuta(pathname: string, preferencia: string): 'dark' | 'light' {
  if (!esRutaTemaPanel(pathname)) return 'light'
  return preferencia === 'dark' ? 'dark' : 'light'
}

/** Sincroniza `dark`/`light` y `high-contrast` en `<html>` (sin tocar otras clases a11y). */
export function aplicarClasesTemaHtml(
  classList: DOMTokenList,
  pathname: string,
  preferencia: string,
  highContrast: boolean,
): 'dark' | 'light' {
  const tema = temaEfectivoParaRuta(pathname, preferencia)
  classList.remove('dark', 'light')
  classList.add(tema)
  classList.toggle('high-contrast', highContrast)
  return tema
}

/** `--hc-bg` claro (`--hc-n-50`) — barra del navegador / PWA chrome. */
export const COLOR_CHROME_CLARO = '#F8F9FB'
/** `--hc-bg` en `html.dark` (tokens). */
export const COLOR_CHROME_OSCURO = '#0E1116'

/** Hex para `<meta name="theme-color">` según tema efectivo. */
export function colorChromeParaTema(tema: 'dark' | 'light'): string {
  return tema === 'dark' ? COLOR_CHROME_OSCURO : COLOR_CHROME_CLARO
}
