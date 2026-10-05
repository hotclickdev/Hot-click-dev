/**
 * Claro u oscuro es una preferencia de quien navega, en toda la app:
 * marketplace, cliente, tienda, login y los paneles.
 *
 * `html.high-contrast` es ortogonal: se aplica junto con esa preferencia.
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
export function temaEfectivoParaRuta(_pathname: string, preferencia: string): 'dark' | 'light' {
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
export const COLOR_CHROME_OSCURO = '#050608'

/** Hex para `<meta name="theme-color">` según tema efectivo. */
export function colorChromeParaTema(tema: 'dark' | 'light'): string {
  return tema === 'dark' ? COLOR_CHROME_OSCURO : COLOR_CHROME_CLARO
}
