import { formatUSD } from '@/utils/format'
/**
 * Textos de precio de los planes (22-oct-2026, V185). Mensualidad en dólares (USD), cobrada por ONVO.
 * Los montos NO viven en el frontend: salen de config del backend (`GET /api/billing/planes` → precioUsd,
 * `GET /api/public/emprende/cupos` → mensualidadUsdSinCupo). Aquí solo quedan las comisiones de respaldo.
 * Emprendedor es gratis mientras haya cupo (primeros 70 negocios); «Sin mensualidad» solo se muestra
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

const miles = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export const colones = (n: number) => `₡${miles(n)}`

export const dolares = (n: number) => formatUSD(n)

/**
 * «US$9/mes» si el backend mandó monto; «Sin mensualidad» solo si `cupoGratis` (dato del backend);
 * si no hay dato, «Mensualidad en dólares» (nunca se inventa un monto ni se promete gratis).
 */
export function textoMensualidad(mensualUsd?: number | null, cupoGratis = false): string {
  if (cupoGratis) return 'Sin mensualidad'
  const n = mensualUsd == null ? NaN : Number(mensualUsd)
  return Number.isFinite(n) && n > 0 ? `${dolares(n)}/mes` : 'Mensualidad en dólares'
}

/** «7,5% por venta». Solo agrega «(mínimo …)» si el API llegara a mandar un mínimo > 0. */
export function textoComision(comisionPct: number, minimaCrc: number = COMISION_MINIMA_CRC): string {
  const pct = Number.isInteger(comisionPct) ? String(comisionPct) : String(comisionPct).replace('.', ',')
  return minimaCrc > 0 ? `${pct}% por venta (mínimo ${colones(minimaCrc)})` : `${pct}% por venta`
}

export function textoPlan(clave: ClavePlan, mensualUsd?: number | null, cupoGratis = false): string {
  const p = PLAN_PRECIOS[clave]
  return `${textoMensualidad(mensualUsd, clave === 'EMPRENDEDOR' && cupoGratis)} + ${textoComision(p.comisionPct)}`
}

/** Mensualidad de Emprendedor según el cupo que manda el backend (`/public/emprende/cupos`). */
export function textoMensualidadEmprendedor(
  cupo: { cuposGratisDisponibles: number; mensualidadUsdSinCupo?: number | null } | null | undefined,
): string {
  if (cupo == null) return textoMensualidad()
  return textoMensualidad(cupo.mensualidadUsdSinCupo, cupo.cuposGratisDisponibles > 0)
}
