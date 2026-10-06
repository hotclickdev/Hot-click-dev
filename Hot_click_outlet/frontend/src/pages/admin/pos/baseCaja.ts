import { useLocation } from 'react-router-dom'

const PREFIJOS_PLAN = ['/emprendedor/pos', '/pyme/pos', '/negocio-plus/pos'] as const

/** Base de la caja según la URL actual: `/caja` o `/{plan}/pos`. */
export function baseCajaDesdePath(pathname: string): string {
  if (pathname === '/caja' || pathname.startsWith('/caja/')) return '/caja'
  for (const prefijo of PREFIJOS_PLAN) {
    if (pathname === prefijo || pathname.startsWith(`${prefijo}/`)) return prefijo
  }
  return '/caja'
}

export function useBaseCaja(): string {
  const { pathname } = useLocation()
  return baseCajaDesdePath(pathname)
}
