export const ESTADOS_COMPLETADOS = new Set(['COMPLETADO', 'ENTREGADO'])

export const ESTADOS_POR_DESPACHAR = [
  'PENDIENTE', 'PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'ENVIADO',
]

export const ESTADO_LABEL = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  EN_PREPARACION: 'En preparación',
  LISTO_RETIRO: 'Listo para retiro',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
}

const MS_POR_MINUTO = 60_000
const MS_POR_HORA = 3_600_000
const MS_POR_DIA = 86_400_000

/** @param {string|null|undefined} dateStr */
export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / MS_POR_MINUTO)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(diff / MS_POR_HORA)
  if (hrs < 24) return `hace ${hrs} h`
  return `hace ${Math.floor(diff / MS_POR_DIA)} d`
}

/** Día civil local (CR), no UTC — si no, después de las 18h “hoy” ya es mañana. */
export function isoDay(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** @param {object[]} ventas @param {string} diaIso */
export function ventasDelDia(ventas, diaIso) {
  return ventas.filter((v) => (v.fechaCreacion ?? '').startsWith(diaIso))
}

/** @param {object[]} lista */
export function totalCompletado(lista) {
  return lista
    .filter((v) => ESTADOS_COMPLETADOS.has(v.estado))
    .reduce((s, v) => s + (v.total ?? 0), 0)
}

/** @param {number} actual @param {number} previo */
export function pctCambio(actual, previo) {
  if (previo <= 0) return null
  return Math.round(((actual - previo) / previo) * 100)
}

/** @param {object[]} ventas */
export function countPorDespachar(ventas) {
  return ventas.filter((v) => ESTADOS_POR_DESPACHAR.includes(v.estado)).length
}

/** @param {object|null} insights @param {number} stockBajoFallback */
export function conteosHoy(insights, stockBajoFallback) {
  const lentos = insights?.lentos ?? []
  const enRiesgo = insights?.enRiesgo ?? []
  return {
    sinStock: enRiesgo.length || stockBajoFallback,
    sinVenta: lentos.length,
  }
}
