import { ESTADOS_COMPLETADOS, toISO } from '../reportes/reportesHelpers'

export { ESTADOS_COMPLETADOS, toISO }

export const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export const TABS_SISTEMA = [
  { key: 'finanzas', label: 'Finanzas' },
  { key: 'analisis', label: 'Análisis y recomendaciones' },
  { key: 'alertas', label: 'Alertas de productos' },
]

/** Tarjetas del mockup: sombra, sin borde. */
export const CARD_SHADOW = '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)'

export function construirDias7() {
  const out = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push({ iso: toISO(d), dow: d.getDay(), label: DIAS[d.getDay()], labelLargo: DIAS_LARGO[d.getDay()] })
  }
  return out
}

export function filtrarVentasSemana(ventas, dias7) {
  return ventas.filter(v => ESTADOS_COMPLETADOS.has(v.estado) && dias7.some(d => (v.fechaCreacion ?? '').startsWith(d.iso)))
}

export function totalesPorDia(dias7, ventasSemana) {
  return dias7.map(d => ({
    ...d,
    total: ventasSemana.filter(v => (v.fechaCreacion ?? '').startsWith(d.iso)).reduce((s, v) => s + (v.total ?? 0), 0),
  }))
}

export function costoDeVentas(ventasSemana) {
  return ventasSemana.reduce((s, v) =>
    s + (v.items ?? []).reduce((si, i) => si + (i.costoUnitarioMomento ?? 0) * (i.cantidad ?? 1), 0), 0)
}

export function productosEstrellaDe(ventasSemana, totalSemana) {
  const map = {}
  ventasSemana.forEach(v => (v.items ?? []).forEach(item => {
    const id = item.producto?.id ?? item.productoId
    const nombre = item.producto?.nombreProducto ?? item.nombreProducto ?? `#${id}`
    if (!id) return
    map[id] = (map[id] ?? { nombre, ingreso: 0 })
    map[id].ingreso += item.subtotalItem ?? ((item.cantidad ?? 1) * (item.precioUnitarioMomento ?? 0))
  }))
  return Object.values(map)
    .sort((a, b) => b.ingreso - a.ingreso)
    .slice(0, 3)
    .map(p => ({ ...p, pct: totalSemana > 0 ? Math.round((p.ingreso / totalSemana) * 100) : 0 }))
}

export function stockEnRiesgo(productos) {
  return productos
    .filter(p => (p.stockActual ?? p.stock ?? 0) <= (p.stockMinimo ?? 5))
    .sort((a, b) => (a.stockActual ?? a.stock ?? 0) - (b.stockActual ?? b.stock ?? 0))
}

export function capitalizar(texto) {
  if (!texto) return '—'
  return texto[0].toUpperCase() + texto.slice(1)
}

export function textoRecomendacionDia(mejorDiaPct, labelLargo) {
  if (mejorDiaPct >= 20) {
    return `Los ${labelLargo} vendés un ${mejorDiaPct}% de tu semana. Probá anunciar una promo ese día para aprovechar el tráfico.`
  }
  return `Tus ventas están repartidas parejo en la semana — el mejor día (${labelLargo}) es solo un ${mejorDiaPct}% del total.`
}

export function textoStockAlerta(actual) {
  if (actual <= 0) return 'Agotado'
  return `Quedan ${actual} unidades, por debajo del mínimo`
}
