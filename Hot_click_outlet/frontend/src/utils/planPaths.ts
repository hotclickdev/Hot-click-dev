import { ROLES_POS, ROLES_VENDEDOR } from './sistemaUser'

/**
 * Prefijos CLAUDECLICK por rol. Fuente de gates, redirects y links Figma.
 */

export const VISITANTE_BASE = '/visitante'
export const RUTA_EMPRENDEDOR = '/emprendedor'
export const RUTA_PYME = '/pyme'
export const RUTA_NEGOCIO_PLUS = '/negocio-plus'
export const ADMIN_BASE = '/admin'

const PREFIJOS_VENDEDOR = [RUTA_EMPRENDEDOR, RUTA_PYME, RUTA_NEGOCIO_PLUS] as const

export function prefijoPorPlan(planNombre: string | null | undefined): string {
  const plan = (planNombre ?? '').toUpperCase()
  if (plan === 'PYME') return RUTA_PYME
  if (plan === 'NEGOCIO_PLUS') return RUTA_NEGOCIO_PLUS
  return RUTA_EMPRENDEDOR
}

export function esPrefijoVendedor(pathname: string): boolean {
  return PREFIJOS_VENDEDOR.some((prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`))
}

export function restoTrasPrefijo(pathname: string, prefijo: string): string {
  if (pathname === prefijo || pathname === `${prefijo}/`) return ''
  if (pathname.startsWith(`${prefijo}/`)) return pathname.slice(prefijo.length + 1)
  return ''
}

export function rutaConPrefijo(prefijo: string, resto = '', search = ''): string {
  const path = resto ? `${prefijo}/${resto.replace(/^\//, '')}` : prefijo
  return `${path}${search}`
}

export function rutaPanelPorRol(rol: string | null | undefined, planNombre?: string | null): string {
  if (rol === 'ADMIN') return ADMIN_BASE
  if (ROLES_VENDEDOR.has(rol ?? '')) return prefijoPorPlan(planNombre)
  if (ROLES_POS.has(rol ?? '')) return `${ADMIN_BASE}/pos`
  return '/'
}

/** Caja y herramientas reales (marca, plan, copilot) se quedan en `/admin`. */
export function vendedorSeQuedaEnAdmin(pathname: string): boolean {
  return (
    pathname.startsWith('/admin/pos')
    || pathname.startsWith('/admin/configuracion')
    || pathname.startsWith('/admin/billing')
    || pathname.startsWith('/admin/copilot')
    || pathname.startsWith('/admin/mi-empresa')
    || pathname.startsWith('/admin/ayuda')
  )
}

export function rutaSellerDesdeAdmin(
  pathname: string,
  search: string,
  planNombre: string | null | undefined,
): string {
  const rest = pathname.replace(/^\/admin\/?/, '')
  const mapped = mapearSegmentoAdmin(rest, search, planNombre)
  const dest = rutaConPrefijo(prefijoPorPlan(planNombre), mapped)
  if (!search || (rest.startsWith('configuracion') && search.includes('seccion='))) return dest
  return `${dest}${search}`
}

function mapearSegmentoAdmin(
  rest: string,
  search: string,
  planNombre: string | null | undefined,
): string {
  const limpio = rest.replace(/\/$/, '')
  if (!limpio || limpio === 'dashboard') return ''
  if (limpio === 'nuevo-producto') return 'productos/nuevo'
  if (limpio.startsWith('productos') || limpio.startsWith('pedidos')) return limpio
  if (limpio.startsWith('reportes')) return 'reportes'
  if (limpio.startsWith('configuracion')) return mapearConfiguracion(search)
  if (limpio === 'mi-empresa') return 'opciones/negocio'
  if (limpio.startsWith('billing')) return 'opciones/plan'
  if (limpio.startsWith('copilot')) return 'opciones/consultas'
  if (limpio.startsWith('ayuda') || limpio.startsWith('garantias')) return 'opciones/ayuda'
  if (limpio.startsWith('bodegas')) {
    return limpio === 'bodegas' ? 'opciones/bodegas' : `opciones/${limpio}`
  }
  if (limpio === 'equipo' || limpio.startsWith('equipo/')) {
    return prefijoPorPlan(planNombre) === RUTA_PYME ? limpio : 'opciones'
  }
  if (limpio === 'marcas') return 'opciones'
  return limpio
}

function mapearConfiguracion(search: string): string {
  if (search.includes('seccion=marca')) return 'opciones/negocio'
  if (search.includes('seccion=bodega')) return 'opciones/bodegas'
  return 'opciones'
}

const MAPA_PROTOTIPO: ReadonlyArray<readonly [string, string]> = [
  ['/prototipo/visitante', VISITANTE_BASE],
  ['/prototipo/emprendedor', RUTA_EMPRENDEDOR],
  ['/prototipo/pyme', RUTA_PYME],
  ['/prototipo/negocio-plus', RUTA_NEGOCIO_PLUS],
  ['/prototipo/admin', ADMIN_BASE],
]

export function destinoPrototipo(pathname: string, search = ''): string {
  if (pathname === '/prototipo' || pathname === '/prototipo/') return `${VISITANTE_BASE}${search}`
  for (const [desde, hacia] of MAPA_PROTOTIPO) {
    if (pathname === desde) return `${hacia}${search}`
    if (pathname.startsWith(`${desde}/`)) return `${hacia}${pathname.slice(desde.length)}${search}`
  }
  return `${VISITANTE_BASE}${search}`
}
