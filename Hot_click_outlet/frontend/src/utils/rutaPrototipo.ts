import { esPrefijoVendedor, VISITANTE_BASE } from './planPaths'

/** Alias `/prototipo` (redirige a los prefijos por rol). */
export function esRutaPrototipo(pathname: string) {
  return pathname === '/prototipo' || pathname.startsWith('/prototipo/')
}

/** Figma Visitante en `/visitante/*`. Home `/` es el marketplace de producción. */
export function esRutaVisitanteFigma(pathname: string) {
  return pathname === VISITANTE_BASE || pathname.startsWith(`${VISITANTE_BASE}/`)
}

export function esRutaVendedorFigma(pathname: string) {
  return esPrefijoVendedor(pathname)
}

export function esRutaClaudeclick(pathname: string) {
  return esRutaPrototipo(pathname) || esRutaVisitanteFigma(pathname) || esRutaVendedorFigma(pathname)
}
