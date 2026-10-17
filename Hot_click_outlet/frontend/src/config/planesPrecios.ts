/**
 * Precios de los planes confirmados por el dueño (16-oct-2026), iguales a `GET /api/planes`
 * (V168–V172). Se usan en el copy estático (landings, /vender, metas); /planes los lee del API
 * y estos valores quedan solo como respaldo si el API no responde.
 */
export type ClavePlan = 'EMPRENDEDOR' | 'PYME' | 'NEGOCIO_PLUS'

export const COMISION_MINIMA_CRC = 700

export const PLAN_PRECIOS: Record<ClavePlan, { mensualCrc: number; comisionPct: number }> = {
  EMPRENDEDOR: { mensualCrc: 0, comisionPct: 9 },
  PYME: { mensualCrc: 12900, comisionPct: 7 },
  NEGOCIO_PLUS: { mensualCrc: 28900, comisionPct: 7 },
}

const miles = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export const colones = (n: number) => `₡${miles(n)}`

/** «₡12.900/mes» o «Sin mensualidad». */
export function textoMensualidad(mensualCrc: number): string {
  return mensualCrc > 0 ? `${colones(mensualCrc)}/mes` : 'Sin mensualidad'
}

/** «7% por venta (mínimo ₡700)». */
export function textoComision(comisionPct: number, minimaCrc: number = COMISION_MINIMA_CRC): string {
  const pct = Number.isInteger(comisionPct) ? String(comisionPct) : String(comisionPct).replace('.', ',')
  return minimaCrc > 0 ? `${pct}% por venta (mínimo ${colones(minimaCrc)})` : `${pct}% por venta`
}

export function textoPlan(clave: ClavePlan): string {
  const p = PLAN_PRECIOS[clave]
  return `${textoMensualidad(p.mensualCrc)} + ${textoComision(p.comisionPct)}`
}
