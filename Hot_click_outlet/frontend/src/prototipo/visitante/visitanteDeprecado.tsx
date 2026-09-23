import { Navigate, useLocation } from 'react-router-dom'
import { VISITANTE_BASE } from '@/utils/planPaths'

/**
 * P1-08 (anexo-6) opción A: `/visitante` deja de ser un marketplace paralelo.
 * Mapea cada pantalla del prototipo Figma a su ruta canónica del marketplace
 * real, para no perder bookmarks (nada de 404: redirect 301-style).
 */
export function destinoMarketplaceDesdeVisitante(pathname: string, search: string): string {
  const esBase = pathname === VISITANTE_BASE || pathname === `${VISITANTE_BASE}/`
  const resto = esBase
    ? ''
    : pathname.startsWith(`${VISITANTE_BASE}/`)
      ? pathname.slice(VISITANTE_BASE.length + 1)
      : pathname

  const [primero, segundo] = resto.split('/').filter(Boolean)

  if (!primero) return '/'
  if (primero === 'shop') return '/productos'
  if (primero === 'discover' || primero === 'recomendados') return '/descubri'
  if (primero === 'carrito') return '/carrito'
  if (primero === 'checkout') return `/checkout${search}`
  if (primero === 'compra-confirmada') return `/pago/exito${search}`
  if (primero === 'pago-fallido') return `/pago/cancelado${search}`
  if (primero === 'producto' && segundo) return `/productos/${segundo}`
  if (primero === 'pedidos') return '/mis-pedidos'
  if (primero === 'favoritos') return '/wishlist'
  if (primero === 'ayuda') return '/informacion'
  // Cuenta Visitante era stub (direcciones/métodos-pago vacíos); Profile real no tiene address book aún.
  if (primero === 'cuenta' || primero === 'direcciones' || primero === 'metodos-pago' || primero === 'notificaciones') {
    return '/perfil'
  }
  // Asesor IA Visitante era script local (no LLM); el chat real ya vive global en el marketplace.
  if (primero === 'asistente' || primero === 'asesor-ia') return '/'
  // Ficha de negocio Visitante no tiene equivalente 1:1 (id de negocio ≠ slug de /tienda/:slug).
  if (primero === 'negocio') return '/productos'
  return '/'
}

/** Redirect de `/visitante` y `/visitante/*` al marketplace real. Ver docs/visual-ux-audit/anexo-6-propuestas.md (P1-08). */
export default function VisitanteDeprecatedRedirect() {
  const { pathname, search } = useLocation()
  return <Navigate to={destinoMarketplaceDesdeVisitante(pathname, search)} replace />
}
