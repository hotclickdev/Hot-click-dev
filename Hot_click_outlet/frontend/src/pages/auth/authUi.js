/**
 * Accent del sitio — usa la variable CSS para respetar light/dark mode.
 * @type {{ color: string, glow: string, bg: string, ring: string }}
 */
export const A = {
  color: 'var(--hc-accent)',
  glow:  'color-mix(in srgb, var(--hc-accent) 22%, transparent)',
  bg:    'color-mix(in srgb, var(--hc-accent) 8%, transparent)',
  ring:  'color-mix(in srgb, var(--hc-accent) 32%, transparent)',
}
