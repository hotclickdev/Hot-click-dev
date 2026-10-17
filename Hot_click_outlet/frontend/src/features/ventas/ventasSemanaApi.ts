import api from '@/services/api'

/**
 * S4-23 / S4-15 / S4-10 · Panel de ventas con bruto, comisión y neto — CONTRATO SUPUESTO (backend S4-09/S4-13/S4-15).
 *   GET /api/negocio/ventas/semana?desde=YYYY-MM-DD →
 *     { desde, hasta, porcentaje, minimoComision, ventas: [{ id, fecha, producto, bruto, comisionPorcentaje,
 *       minimoAplicado: boolean, comision, neto }], totales: { bruto, comision, neto, conMinimo, cantidad } }
 * Regla (confirmada 16-oct-2026): comisión = máx(% del bruto, mínimo); el mínimo lo paga el negocio.
 * Todos los montos y el % vienen del backend; el front no calcula cobros. Corte de semana: pendiente del dueño.
 */
export type VentaSemana = {
  id: string; fecha: string; producto: string; bruto: number; comisionPorcentaje: number
  minimoAplicado: boolean; comision: number; neto: number
}
export type SemanaVentas = {
  desde: string; hasta: string; porcentaje: number | null; minimoComision: number | null
  ventas: VentaSemana[]
  totales: { bruto: number; comision: number; neto: number; conMinimo: number; cantidad: number }
}

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const s = (v: unknown) => (typeof v === 'string' ? v : '')

export function normalizarSemana(data: unknown): SemanaVentas {
  const d = ((data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) ?? {}) as Record<string, unknown>
  const ventas = (Array.isArray(d.ventas) ? d.ventas : []).map((x) => {
    const v = (x ?? {}) as Record<string, unknown>
    return { id: String(v.id ?? ''), fecha: s(v.fecha), producto: s(v.producto), bruto: n(v.bruto), comisionPorcentaje: n(v.comisionPorcentaje), minimoAplicado: v.minimoAplicado === true, comision: n(v.comision), neto: n(v.neto) }
  })
  const t = (d.totales ?? {}) as Record<string, unknown>
  return {
    desde: s(d.desde), hasta: s(d.hasta),
    porcentaje: typeof d.porcentaje === 'number' ? d.porcentaje : null,
    minimoComision: typeof d.minimoComision === 'number' ? d.minimoComision : null,
    ventas,
    totales: { bruto: n(t.bruto), comision: n(t.comision), neto: n(t.neto), conMinimo: n(t.conMinimo), cantidad: typeof t.cantidad === 'number' ? t.cantidad : ventas.length },
  }
}

export const ventasSemanaApi = {
  semana: (desde?: string) => api.get('/negocio/ventas/semana', { params: desde ? { desde } : undefined }).then((r) => normalizarSemana(r.data)),
}

/** Lunes de la semana de `fecha` ± `semanas` (YYYY-MM-DD). El corte real lo confirma el dueño. */
export function lunesDe(fecha: Date, semanas = 0): string {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + semanas * 7)
  const dia = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dia)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** «Comisión mínima: ₡X por venta…» con un ejemplo calculado con el % del plan (si el backend lo manda). */
export function explicacionMinimo(porcentaje: number | null, minimo: number | null, fmt: (v: number) => string): string | null {
  if (minimo == null) return null
  const base = `Comisión mínima: ${fmt(minimo)} por venta. La paga el negocio.`
  if (porcentaje == null || porcentaje <= 0) return base
  const ejemploBruto = Math.ceil((minimo / (porcentaje / 100)) / 1000) * 1000 / 2
  const pct = Math.round(ejemploBruto * porcentaje / 100)
  if (pct >= minimo) return `${base} Si el ${porcentaje} % da menos, se cobra ${fmt(minimo)}.`
  return `${base} Si el ${porcentaje} % da menos, se cobra ${fmt(minimo)}. Ej.: venta ${fmt(ejemploBruto)} → ${porcentaje} % = ${fmt(pct)} → se cobra ${fmt(minimo)} por mínimo.`
}
