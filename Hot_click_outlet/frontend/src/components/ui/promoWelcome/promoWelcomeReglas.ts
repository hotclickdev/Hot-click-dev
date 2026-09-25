export const PAGINAS_ANTES_DE_PROMO = 3
export const COOLDOWN_DIAS = 7
const MS_POR_DIA = 1000 * 60 * 60 * 24
const RUTAS_SIN_PROMO = ['/carrito', '/checkout', '/pago']

/**
 * El cupón se ofrece a quien ya está explorando, no a quien acaba de llegar:
 * un modal en la primera página tapa el catálogo antes de que se vea.
 */
export function debeMostrarPromo(params: {
  paginasVistas: number
  pathname: string
  ultimaVezVisto: number | null
  ahora: number
}): boolean {
  const { paginasVistas, pathname, ultimaVezVisto, ahora } = params
  if (paginasVistas < PAGINAS_ANTES_DE_PROMO) return false
  if (RUTAS_SIN_PROMO.some((ruta) => pathname.startsWith(ruta))) return false
  if (ultimaVezVisto === null || Number.isNaN(ultimaVezVisto)) return true
  return (ahora - ultimaVezVisto) / MS_POR_DIA >= COOLDOWN_DIAS
}
