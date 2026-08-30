import { VISITANTE_BASE } from '@/utils/planPaths'
import { esRutaVisitanteFigma } from '@/utils/rutaPrototipo'

/**
 * Skin Figma Visitante (~375): pathname `/visitante/*` o prop `embedded`
 * cuando el checkout vive bajo VisitanteShell.
 *
 * Nombre distinto de `CheckoutChrome.tsx` (Windows no distingue casing).
 */
export function usaSkinVisitanteCheckout(pathname: string, embedded?: boolean): boolean {
  if (embedded === true) return true
  return esRutaVisitanteFigma(pathname)
}

export function hrefCarritoCheckout(skinVisitante: boolean): string {
  return skinVisitante ? `${VISITANTE_BASE}/carrito` : '/carrito'
}

export function hrefPedidosCheckout(skinVisitante: boolean): string {
  return skinVisitante ? `${VISITANTE_BASE}/pedidos` : '/mis-pedidos'
}

export function hrefCatalogoCheckout(skinVisitante: boolean): string {
  return skinVisitante ? `${VISITANTE_BASE}/shop` : '/productos'
}
