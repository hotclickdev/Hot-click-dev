import {
  isoDay,
  pctCambio,
  totalCompletado,
  ventasDelDia,
} from '../sistema-inicio/sistemaInicioHelpers'

const CANAL_LABEL = {
  POS: 'POS',
  ONLINE: 'Marketplace',
  TIENDA_WEB: 'Tienda web',
  QR: 'QR',
  ASIGNACION_MANUAL: 'Asignación',
}

/**
 * @param {string|null|undefined} origen
 * @param {string|null|undefined} metodoPago
 */
export function etiquetaCanal(origen, metodoPago) {
  if (origen && CANAL_LABEL[origen]) return CANAL_LABEL[origen]
  if (origen) return origen
  return metodoPago || 'Sin canal'
}

/** @param {object[]} ventas */
export function conteoPorCanal(ventas) {
  const map = {}
  for (const venta of ventas) {
    const canal = etiquetaCanal(venta.origen, venta.metodoPago)
    map[canal] = (map[canal] ?? 0) + 1
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1])
}

/** @param {number|null} pct */
export function textoCambioPct(pct) {
  if (pct == null) return 'Sin dato de ayer'
  if (pct === 0) return 'Igual que ayer'
  const signo = pct > 0 ? '+' : ''
  return `${signo}${pct}% vs ayer`
}

/** @param {number} hoy @param {number} ayer */
export function textoCambioDelta(hoy, ayer) {
  const delta = hoy - ayer
  if (delta === 0) return 'Igual que ayer'
  const signo = delta > 0 ? '+' : ''
  return `${signo}${delta} vs ayer`
}

/** @param {number|null} pct */
export function tonoCambio(pct) {
  if (pct == null || pct === 0) return 'neutral'
  return pct > 0 ? 'up' : 'down'
}

/**
 * KPIs de decisión para Admin IT. No es el home de Sistema.
 * @param {object[]} ventas
 * @param {object|null} stats
 */
export function metricasDecision(ventas, stats) {
  const lista = Array.isArray(ventas) ? ventas : []
  const hoy = isoDay(0)
  const ayer = isoDay(1)
  const ventasHoy = ventasDelDia(lista, hoy)
  const ventasAyer = ventasDelDia(lista, ayer)
  const totalHoy = totalCompletado(ventasHoy)
  const totalAyer = totalCompletado(ventasAyer)
  const ticketHoy = ventasHoy.length > 0 ? Math.round(totalHoy / ventasHoy.length) : 0
  const ticketAyer = ventasAyer.length > 0 ? Math.round(totalAyer / ventasAyer.length) : 0
  const pctIngresos = pctCambio(totalHoy, totalAyer)
  const pctTicket = pctCambio(ticketHoy, ticketAyer)
  const canalFuente = ventasHoy.length > 0 ? ventasHoy : lista

  return {
    totalHoy,
    pctIngresos,
    pedidosHoy: ventasHoy.length,
    pedidosAyer: ventasAyer.length,
    ticketHoy,
    pctTicket,
    stockBajo: stats?.stockBajo ?? 0,
    canales: conteoPorCanal(canalFuente),
    canalDeHoy: ventasHoy.length > 0,
  }
}
