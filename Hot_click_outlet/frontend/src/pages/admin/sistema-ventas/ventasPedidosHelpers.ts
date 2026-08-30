import type { CSSProperties } from 'react'
import type { Pedido } from '@/types/pedido'

export const PERIODOS_VENTAS = [
  { key: 'hoy',    label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes',    label: 'Este mes' },
]

export const CARD_SHADOW = '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)'
export const PILL_BORDER = '#d8cfc0'
const MS_POR_DIA = 86_400_000

export type ItemVentaPos = {
  nombre?: string
  producto?: { nombreProducto?: string }
}

export type VentaPosHistorial = {
  id?: number | string
  numeroPedido?: string
  fechaPedido?: string
  metodoPago?: string
  totalPedido?: number
  items?: ItemVentaPos[]
}

export function dentroDelPeriodo(fechaStr: string | null | undefined, periodo: string) {
  if (!fechaStr) return false
  const fecha = new Date(fechaStr)
  const ahora = new Date()
  const diffDias = (ahora.getTime() - fecha.getTime()) / MS_POR_DIA
  if (periodo === 'hoy')    return fecha.toDateString() === ahora.toDateString()
  if (periodo === 'semana') return diffDias <= 7
  if (periodo === 'mes')    return diffDias <= 30
  return true
}

export function estiloPildora(activa: boolean): CSSProperties {
  if (activa) {
    return { backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid var(--hc-accent)', color: 'var(--hc-accent)', fontWeight: 700 }
  }
  return { backgroundColor: 'var(--hc-surface)', border: `1px solid ${PILL_BORDER}`, color: 'var(--hc-text)' }
}

export function estiloTab(activa: boolean): CSSProperties {
  if (activa) return { backgroundColor: 'var(--hc-accent)', color: '#fff' }
  return { color: 'var(--hc-muted)' }
}

export function estiloBadgePendientes(tabPedidosActiva: boolean): CSSProperties {
  if (tabPedidosActiva) {
    return { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }
  }
  return { backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)' }
}

export const FILTROS_PEDIDOS_SISTEMA = [
  { key: 'por_despachar', label: 'Por despachar' },
  { key: 'PAGADO', label: 'Pagados' },
  { key: 'ENTREGADO', label: 'Entregados' },
  { key: 'Todos', label: 'Todos' },
]

export const ESTADOS_POR_DESPACHAR = [
  'PENDIENTE', 'PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'ENVIADO',
]

const LABEL_FILTRO: Record<string, string> = Object.fromEntries(FILTROS_PEDIDOS_SISTEMA.map((f) => [f.key, f.label]))

export function pedidosDelFiltro(orders: Pedido[], filter: string) {
  if (filter === 'Todos') return orders
  if (filter === 'por_despachar') {
    return orders.filter((o) => ESTADOS_POR_DESPACHAR.includes(o.estado ?? ''))
  }
  return orders.filter((o) => o.estado === filter)
}

export function textoVacioPedidos(filter: string) {
  if (filter === 'por_despachar') return 'No hay pedidos por despachar.'
  if (filter !== 'Todos') return `Sin pedidos en ${LABEL_FILTRO[filter] ?? filter}.`
  return 'Todavía no tenés pedidos.'
}

export function textoConteoPedidos(total: number, pendientes: number) {
  const base = `${total} pedido${total === 1 ? '' : 's'} registrado${total === 1 ? '' : 's'}`
  if (pendientes <= 0) return base
  return `${base} · ${pendientes} pendiente${pendientes === 1 ? '' : 's'} de entregar`
}

export function nombresArticulosVenta(venta: VentaPosHistorial) {
  return (venta.items ?? []).map(i => i.producto?.nombreProducto ?? i.nombre).filter(Boolean).join(', ') || '—'
}

export function listaVentasPos(data: unknown): VentaPosHistorial[] {
  const nested = data && typeof data === 'object' && 'data' in data
    ? (data as { data?: unknown }).data
    : undefined
  return (nested ?? []) as VentaPosHistorial[]
}
