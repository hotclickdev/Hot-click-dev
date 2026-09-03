/** Clases de drag-over para la zona de foto del producto. */

type Opts = Readonly<{
  arrastrando: boolean
  reducedMotion: boolean
  bordeDiscontinuo: boolean
}>

function fondoZonaFoto(arrastrando: boolean, bordeDiscontinuo: boolean): string {
  if (arrastrando) {
    return bordeDiscontinuo ? 'border-hc-accent bg-hc-accent/10' : 'bg-hc-accent/10'
  }
  return bordeDiscontinuo ? 'border-hc-border bg-[var(--hc-n-50)]' : 'bg-hc-surface-2'
}

/**
 * Fondo + escala del dropzone. Sin escala si prefers-reduced-motion.
 */
export function clasesZonaFotoDrag({
  arrastrando,
  reducedMotion,
  bordeDiscontinuo,
}: Opts): string {
  const transicion = 'transition-[transform,background-color,border-color] duration-200 ease-out'
  const fondo = fondoZonaFoto(arrastrando, bordeDiscontinuo)
  const escala = arrastrando && !reducedMotion ? 'scale-[1.03]' : 'scale-100'
  return `${transicion} ${fondo} ${escala}`
}
