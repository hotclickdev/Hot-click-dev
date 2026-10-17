import api from '@/services/api'

/**
 * S6-21 · Página de envíos — CONTRATO SUPUESTO (backend, decisión S4-04 / DIS-3 opción A).
 *   GET /api/public/envios/tarifas → {
 *     cobroPorNegocio: boolean,
 *     opciones: [{ clave, nombre, donde, montoDesde: number|null, montoHasta: number|null,
 *                  sumaTarifaCourier?: boolean, tiempo: string|null, contraEntrega: 'SI'|'NO'|'POR_CONFIRMAR' }],
 *     contraEntrega: { cargo: number|null, montoMinimoOpcional: boolean }
 *   }
 * Ningún monto vive en el código: lo que no venga del backend se muestra como «monto a definir por HOT_CLICK».
 */
export const POR_DEFINIR = 'a definir por HOT_CLICK'
export const MONTO_POR_DEFINIR = 'Monto a definir por HOT_CLICK'

export type ContraEntregaOpcion = 'SI' | 'NO' | 'POR_CONFIRMAR'
export type OpcionEnvioPublica = { clave: string; nombre: string; donde: string; montoDesde: number | null; montoHasta: number | null; sumaTarifaCourier: boolean; tiempo: string | null; contraEntrega: ContraEntregaOpcion }
export type TarifasEnvio = { cobroPorNegocio: boolean; opciones: OpcionEnvioPublica[]; contraEntrega: { cargo: number | null; montoMinimoOpcional: boolean } }

const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})
const monto = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)
const txt = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

export function normalizarTarifas(data: unknown): TarifasEnvio {
  const root = obj(data)
  const d = root.data && typeof root.data === 'object' ? obj(root.data) : root
  const opciones = (Array.isArray(d.opciones) ? d.opciones : []).map((x) => {
    const o = obj(x)
    const ce = o.contraEntrega === 'SI' || o.contraEntrega === 'NO' ? o.contraEntrega : 'POR_CONFIRMAR'
    return { clave: String(o.clave ?? ''), nombre: txt(o.nombre) ?? '', donde: txt(o.donde) ?? '', montoDesde: monto(o.montoDesde), montoHasta: monto(o.montoHasta), sumaTarifaCourier: o.sumaTarifaCourier === true, tiempo: txt(o.tiempo), contraEntrega: ce as ContraEntregaOpcion }
  }).filter((o) => o.clave && o.nombre)
  const ce = obj(d.contraEntrega)
  return { cobroPorNegocio: d.cobroPorNegocio !== false, opciones, contraEntrega: { cargo: monto(ce.cargo), montoMinimoOpcional: ce.montoMinimoOpcional === true } }
}

export function textoCosto(o: Pick<OpcionEnvioPublica, 'montoDesde' | 'montoHasta' | 'sumaTarifaCourier'>, fmt: (n: number) => string): string {
  if (o.montoDesde === null) return MONTO_POR_DEFINIR
  const base = o.montoHasta !== null && o.montoHasta !== o.montoDesde ? `${fmt(o.montoDesde)} a ${fmt(o.montoHasta)} según la zona` : fmt(o.montoDesde)
  return o.sumaTarifaCourier ? `${base} + la tarifa del courier (la pagás vos)` : base
}

export const textoContraEntrega = (c: ContraEntregaOpcion) => ({ SI: 'Sí', NO: 'No', POR_CONFIRMAR: 'Por confirmar' }[c])

export const enviosApi = {
  tarifas: () => api.get('/public/envios/tarifas').then((r) => normalizarTarifas(r.data)),
}
