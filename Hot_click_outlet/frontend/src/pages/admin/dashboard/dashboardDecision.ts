import {
  isoDay,
  pctCambio,
  totalCompletado,
  ventasDelDia,
} from '../sistema-inicio/sistemaInicioHelpers'
import type { DashboardStats, VentaDashboard } from './dashboardHelpers'

const CANAL_LABEL: Record<string, string> = {
  POS: 'POS',
  ONLINE: 'Marketplace',
  TIENDA_WEB: 'Tienda web',
  QR: 'QR',
  ASIGNACION_MANUAL: 'Asignación',
}

export type TonoCambio = 'up' | 'down' | 'neutral'

export type MetricasDecision = {
  totalHoy: number
  pctIngresos: number | null
  pedidosHoy: number
  pedidosAyer: number
  ticketHoy: number
  pctTicket: number | null
  stockBajo: number
  canales: [string, number][]
  canalDeHoy: boolean
}

export function etiquetaCanal(origen?: string | null, metodoPago?: string | null) {
  if (origen && CANAL_LABEL[origen]) return CANAL_LABEL[origen]
  if (origen) return origen
  return metodoPago || 'Sin canal'
}

export function conteoPorCanal(ventas: VentaDashboard[]): [string, number][] {
  const map: Record<string, number> = {}
  for (const venta of ventas) {
    const canal = etiquetaCanal(venta.origen, venta.metodoPago)
    map[canal] = (map[canal] ?? 0) + 1
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1])
}

export function textoCambioPct(pct: number | null) {
  if (pct == null) return 'Sin dato de ayer'
  if (pct === 0) return 'Igual que ayer'
  const signo = pct > 0 ? '+' : ''
  return `${signo}${pct}% vs ayer`
}

export function textoCambioDelta(hoy: number, ayer: number) {
  const delta = hoy - ayer
  if (delta === 0) return 'Igual que ayer'
  const signo = delta > 0 ? '+' : ''
  return `${signo}${delta} vs ayer`
}

export function tonoCambio(pct: number | null): TonoCambio {
  if (pct == null || pct === 0) return 'neutral'
  return pct > 0 ? 'up' : 'down'
}

/**
 * KPIs de decisión para Admin IT. No es el home de Sistema.
 */
export function metricasDecision(ventas: VentaDashboard[], stats: DashboardStats | null): MetricasDecision {
  const lista = Array.isArray(ventas) ? ventas : []
  const hoy = isoDay(0)
  const ayer = isoDay(1)
  const ventasHoy: VentaDashboard[] = ventasDelDia(lista, hoy)
  const ventasAyer: VentaDashboard[] = ventasDelDia(lista, ayer)
  const totalHoy: number = totalCompletado(ventasHoy)
  const totalAyer: number = totalCompletado(ventasAyer)
  const ticketHoy = ventasHoy.length > 0 ? Math.round(totalHoy / ventasHoy.length) : 0
  const ticketAyer = ventasAyer.length > 0 ? Math.round(totalAyer / ventasAyer.length) : 0
  const pctIngresos: number | null = pctCambio(totalHoy, totalAyer)
  const pctTicket: number | null = pctCambio(ticketHoy, ticketAyer)
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
