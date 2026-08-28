export const ADMIN_FIGMA_BASE = '/prototipo/admin'

export function adminFigmaRuta(segmento = ''): string {
  const limpio = segmento.replace(/^\//, '')
  if (!limpio) return ADMIN_FIGMA_BASE
  return `${ADMIN_FIGMA_BASE}/${limpio}`
}
