export const PERIODOS_VENTAS = [
  { key: 'hoy',    label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes',    label: 'Este mes' },
]

export const CARD_SHADOW = '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)'
export const PILL_BORDER = '#d8cfc0'
const MS_POR_DIA = 86_400_000

export function dentroDelPeriodo(fechaStr, periodo) {
  if (!fechaStr) return false
  const fecha = new Date(fechaStr)
  const ahora = new Date()
  const diffDias = (ahora - fecha) / MS_POR_DIA
  if (periodo === 'hoy')    return fecha.toDateString() === ahora.toDateString()
  if (periodo === 'semana') return diffDias <= 7
  if (periodo === 'mes')    return diffDias <= 30
  return true
}

export function estiloPildora(activa) {
  if (activa) {
    return { backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid var(--hc-accent)', color: 'var(--hc-accent)', fontWeight: 700 }
  }
  return { backgroundColor: 'var(--hc-surface)', border: `1px solid ${PILL_BORDER}`, color: 'var(--hc-text)' }
}

export function estiloTab(activa) {
  if (activa) return { backgroundColor: 'var(--hc-accent)', color: '#fff' }
  return { color: 'var(--hc-muted)' }
}

export function estiloBadgePendientes(tabPedidosActiva) {
  if (tabPedidosActiva) {
    return { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }
  }
  return { backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)' }
}

export function textoVacioPedidos(filter) {
  if (filter !== 'Todos') return `Sin pedidos con estado ${filter}`
  return 'Todavía no tenés pedidos.'
}

export function textoConteoPedidos(total, pendientes) {
  const base = `${total} pedido${total === 1 ? '' : 's'} registrado${total === 1 ? '' : 's'}`
  if (pendientes <= 0) return base
  return `${base} · ${pendientes} pendiente${pendientes === 1 ? '' : 's'} de entregar`
}

export function nombresArticulosVenta(venta) {
  return (venta.items ?? []).map(i => i.producto?.nombreProducto ?? i.nombre).filter(Boolean).join(', ') || '—'
}
