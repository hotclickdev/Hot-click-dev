import { formatUSD } from '@/utils/format'
/**
 * Textos de precio de los planes (22-oct-2026, V185). Mensualidad cobrada por ONVO en la moneda que fija el backend (CRC o USD).
 * Los montos NO viven en el frontend: salen de config del backend (`GET /api/billing/planes` → precioUsd,
 * `GET /api/public/emprende/cupos` → mensualidadUsdSinCupo). Aquí solo quedan las comisiones de respaldo.
 * Emprendedor es gratis mientras haya cupo (los primeros N negocios, N = `limite` de ese mismo endpoint); «Sin mensualidad» solo se muestra
 * cuando el backend confirma que hay cupo.
 */
export type ClavePlan = 'EMPRENDEDOR' | 'PYME' | 'NEGOCIO_PLUS'

/** Desde V185 no hay mínimo por venta. Se deja en 0 por compatibilidad con quien lo importe. */
export const COMISION_MINIMA_CRC = 0

export const PLAN_PRECIOS: Record<ClavePlan, { comisionPct: number }> = {
  EMPRENDEDOR: { comisionPct: 9 },
  PYME: { comisionPct: 7.5 },
  NEGOCIO_PLUS: { comisionPct: 6 },
}

/**
 * Moneda en la que se cobra la mensualidad de los planes: la decide el backend (`PLANES_MONEDA`, código ISO) y llega
 * como `moneda` junto al monto (`precioUsd`, nombre legado: es el monto en ESA moneda). Aquí no se asume ninguna:
 * CRC → colones, USD → dólares; ausente u otra moneda → texto neutro, sin monto (nunca se inventa una cifra).
 */
export type MonedaPlan = string | null | undefined

const codigoMoneda = (moneda: MonedaPlan): 'CRC' | 'USD' | null => {
  const c = typeof moneda === 'string' ? moneda.trim().toUpperCase() : ''
  return c === 'CRC' || c === 'USD' ? c : null
}

const miles = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export const colones = (n: number) => `₡${miles(n)}`

export const dolares = (n: number) => formatUSD(n)

/** «₡12.900» o «US$24» según la moneda del backend; null si la moneda no se conoce (no se arma un monto). */
export function formatoMontoPlan(monto: number, moneda: MonedaPlan): string | null {
  const c = codigoMoneda(moneda)
  if (c === 'CRC') return colones(monto)
  if (c === 'USD') return dolares(monto)
  return null
}

/**
 * Frase de moneda para /planes y Admin › Planes. Los productos se venden en colones; la mensualidad se cobra en la
 * moneda del backend.
 */
export function textoMonedaPlanes(moneda: MonedaPlan): string {
  const c = codigoMoneda(moneda)
  if (c === 'CRC') return 'Tus productos se venden en colones. La mensualidad del plan se cobra en colones (CRC), con tarjeta, por ONVO.'
  if (c === 'USD') return 'Tus productos se venden en colones. La mensualidad del plan se cobra en dólares (USD), con tarjeta, por ONVO.'
  return 'Tus productos se venden en colones. La mensualidad del plan se cobra con tarjeta, por ONVO.'
}

/** «Mensualidad en colones», «Mensualidad en dólares» o, con moneda desconocida, «Mensualidad del plan». */
export function etiquetaMensualidad(moneda?: MonedaPlan): string {
  const c = codigoMoneda(moneda)
  if (c === 'CRC') return 'Mensualidad en colones'
  if (c === 'USD') return 'Mensualidad en dólares'
  return 'Mensualidad del plan'
}

/**
 * «₡12.900/mes» o «US$9/mes» si el backend mandó monto y moneda; «Sin mensualidad» solo si `cupoGratis` (dato del
 * backend); si no hay dato, la etiqueta sin monto (nunca se inventa un monto ni se promete gratis).
 */
export function textoMensualidad(mensual?: number | null, cupoGratis = false, moneda?: MonedaPlan): string {
  if (cupoGratis) return 'Sin mensualidad'
  const n = mensual == null ? NaN : Number(mensual)
  const monto = Number.isFinite(n) && n > 0 ? formatoMontoPlan(n, moneda) : null
  return monto ? `${monto}/mes` : etiquetaMensualidad(moneda)
}

/** «7,5% por venta». Solo agrega «(mínimo …)» si el API llegara a mandar un mínimo > 0. */
export function textoComision(comisionPct: number, minimaCrc: number = COMISION_MINIMA_CRC): string {
  const pct = Number.isInteger(comisionPct) ? String(comisionPct) : String(comisionPct).replace('.', ',')
  return minimaCrc > 0 ? `${pct}% por venta (mínimo ${colones(minimaCrc)})` : `${pct}% por venta`
}

export function textoPlan(clave: ClavePlan, mensual?: number | null, cupoGratis = false, moneda?: MonedaPlan): string {
  const p = PLAN_PRECIOS[clave]
  return `${textoMensualidad(mensual, clave === 'EMPRENDEDOR' && cupoGratis, moneda)} + ${textoComision(p.comisionPct)}`
}

/** Mensualidad de Emprendedor según el cupo que manda el backend (`/public/emprende/cupos`). */
export function textoMensualidadEmprendedor(
  cupo: { cuposGratisDisponibles: number; mensualidadUsdSinCupo?: number | null; moneda?: MonedaPlan } | null | undefined,
): string {
  if (cupo == null) return textoMensualidad()
  return textoMensualidad(cupo.mensualidadUsdSinCupo, cupo.cuposGratisDisponibles > 0, cupo.moneda)
}

/**
 * BAJO área 9: /vender mostraba «Mensualidad en dólares» sin monto porque no leía `GET /billing/planes`.
 * Mapa clave → precioUsd (monto en la moneda del backend; solo montos > 0 que mandó el backend; nunca se inventan).
 */
export function mensualidadesUsd(planes: unknown): Partial<Record<ClavePlan, number>> {
  const out: Partial<Record<ClavePlan, number>> = {}
  if (!Array.isArray(planes)) return out
  for (const p of planes as Array<{ nombre?: unknown; precioUsd?: unknown }>) {
    const n = Number(p?.precioUsd)
    if (typeof p?.nombre === 'string' && p.nombre in PLAN_PRECIOS && Number.isFinite(n) && n > 0) {
      out[p.nombre as ClavePlan] = n
    }
  }
  return out
}


/** Moneda (código ISO) que el backend publicó con los planes; null si ninguno la trae. */
export function monedaDePlanes(planes: unknown): string | null {
  if (!Array.isArray(planes)) return null
  for (const p of planes as Array<{ moneda?: unknown }>) {
    if (typeof p?.moneda === 'string' && p.moneda.trim()) return p.moneda.trim().toUpperCase()
  }
  return null
}

/**
 * Primer mes gratis (PyME y Negocio Plus). `diasPrueba` llega del backend en cada plan de `GET /billing/planes` y
 * `GET /api/planes`: días gratis genéricos que ofrece ese plan (0 o ausente = sin oferta). Aquí no hay ninguna cifra:
 * Emprendedor queda siempre en 0 (tiene su propio cupo y sus textos).
 */
export const NOTA_UNA_VEZ_POR_NEGOCIO = 'Una vez por negocio.'

/** Días gratis válidos (entero > 0) o 0. Emprendedor siempre 0: su prueba es el cupo, no esta oferta. */
export function diasPruebaPlan(clave: string | null | undefined, dias: unknown): number {
  if (clave == null || clave === 'EMPRENDEDOR' || !(clave in PLAN_PRECIOS)) return 0
  const n = Number(dias)
  return Number.isInteger(n) && n > 0 ? n : 0
}

/** «Primer mes gratis» (30 o 31 días), «Primeros N días gratis» o null si no hay oferta. */
export function textoPrimerMesGratis(dias: unknown): string | null {
  const n = Number(dias)
  if (!Number.isInteger(n) || n <= 0) return null
  if (n === 30 || n === 31) return 'Primer mes gratis'
  return n === 1 ? 'Primer día gratis' : `Primeros ${n} días gratis`
}

/** «Primer mes gratis, luego ₡12.900/mes» (monto con la moneda del backend; sin monto, «luego mensualidad del plan»). */
export function textoPrimerMesLuego(dias: unknown, monto?: number | null, moneda?: MonedaPlan): string | null {
  const gratis = textoPrimerMesGratis(dias)
  if (!gratis) return null
  const luego = textoMensualidad(monto, false, moneda).replace(/^M/, 'm')
  return `${gratis}, luego ${luego}`
}

/** Mapa clave → días gratis de los planes del backend (solo PyME y Negocio Plus con diasPrueba > 0). */
export function diasPruebaPlanes(planes: unknown): Partial<Record<ClavePlan, number>> {
  const out: Partial<Record<ClavePlan, number>> = {}
  if (!Array.isArray(planes)) return out
  for (const p of planes as Array<{ nombre?: unknown; diasPrueba?: unknown }>) {
    const nombre = typeof p?.nombre === 'string' ? p.nombre : null
    const n = diasPruebaPlan(nombre, p?.diasPrueba)
    if (nombre && n > 0) out[nombre as ClavePlan] = n
  }
  return out
}

/**
 * Días de «Primer mes gratis» que se pueden mostrar. Anónimo: los `diasPrueba` genéricos del plan. Con sesión: solo si el
 * backend marcó `primerMesGratisDisponible === true` para ese negocio; ausente o false → 0 (precio normal).
 */
export function diasVisiblesPrimerMes(
  dias: number | undefined | null,
  sesion: { logueado: boolean; elegible?: boolean | null },
): number {
  const n = Number(dias)
  if (!Number.isInteger(n) || n <= 0) return 0
  return sesion.logueado && sesion.elegible !== true ? 0 : n
}
