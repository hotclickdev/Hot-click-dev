/**
 * Mapeo Figma CLAUDECLICK → tokens de producción.
 *
 * El Brand Book del repo manda: no reemplazar paleta/fuentes por el mock
 * de Figma sin decisión de producto.
 *
 * Huecos vs Figma:
 * - Figma rojo #E31E24 / azul #0D47A1 / navy #0B132B; producción usa
 *   --hc-red-500 #E73B33 y --hc-blue-600 #1747A8.
 * - Figma tipografía Poppins; producción Sora + Public Sans.
 * - Sin keyframes en el archivo Figma (logo/hero son estáticos).
 * - Fotos de catálogo en Visitante son placeholders.
 * - image 3 (PDP desktop) no está como frame con capas.
 * Super Admin (41:128):
 * - Login 59:294 deja el input de correo a 163px; el prototipo usa ancho completo.
 * - Elipse decorativa detras del isotipo del dashboard no se porta.
 * - Fotos de producto en moderacion y vista previa son bloques de superficie.
 * - Emojis del mock (reloj, ojo, lupa, estrellas) se reemplazan por texto.
 * - Figma lista 6 productos en moderacion y muestra 4; el prototipo sigue las 4 cards.
 * - Agregar marca / garantia / servicio abre Proximamente (no hay frame de alta).
 */
export const FIGMA_BRAND = {
  red: '#E31E24',
  blue: '#0D47A1',
  navy: '#0B132B',
} as const

export const TOKEN_CSS = {
  primary: 'var(--hc-primary)',
  accent: 'var(--hc-accent)',
  text: 'var(--hc-text)',
  muted: 'var(--hc-muted)',
  surface: 'var(--hc-surface)',
  bg: 'var(--hc-bg)',
  border: 'var(--hc-border)',
} as const

export type RolPrototipo = 'visitante' | 'emprendedor' | 'pyme' | 'negocioPlus' | 'admin'
