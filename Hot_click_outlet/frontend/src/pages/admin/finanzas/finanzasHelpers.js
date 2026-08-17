export const ESTADOS_COMPLETADOS = new Set(['ENTREGADO', 'COMPLETADO'])

export const QUICK_DAYS = [0, 7, 30, -1]
export const QUICK_LABEL = { 0: 'Hoy', 7: '7 días', 30: '30 días', '-1': 'Todo' }

export const CATEGORIAS = [
  'ALQUILER',
  'SALARIOS',
  'MARKETING',
  'ENVIOS_EXTERNOS',
  'SERVICIOS',
  'INSUMOS',
  'IMPUESTOS',
  'OTRO',
]

export const COLUMNAS_EXPORT_INGRESOS = [
  'id',
  'fecha',
  'origen',
  'metodoPago',
  'productos',
  'envio',
  'total',
]

const ORIGEN_BG = {
  ONLINE: 'rgba(23,71,168,0.12)',
  POS: 'rgba(52,211,153,0.12)',
  MANUAL: 'rgba(251,191,36,0.12)',
}

const ORIGEN_COLOR = {
  ONLINE: 'var(--hc-accent)',
  POS: '#34d399',
  MANUAL: '#fbbf24',
}

/** @param {Date} fecha */
export function toISO(fecha) {
  return fecha.toISOString().slice(0, 10)
}

export const EMPTY_GASTO = {
  concepto: '',
  monto: '',
  categoria: 'OTRO',
  fecha: toISO(new Date()),
  notas: '',
}

/** @param {number} days */
export function rangoDesdeQuick(days) {
  if (days === -1) return { desde: '', hasta: '' }
  if (days === 0) {
    const hoy = toISO(new Date())
    return { desde: hoy, hasta: hoy }
  }
  const fin = new Date()
  const inicio = new Date()
  inicio.setDate(inicio.getDate() - days)
  return { desde: toISO(inicio), hasta: toISO(fin) }
}

/** @param {unknown} data */
export function listaPedidosDesdeRespuesta(data) {
  const raw = data?.data ?? data
  const all = Array.isArray(raw) ? raw : raw?.content ?? []
  return all.filter((p) => ESTADOS_COMPLETADOS.has(p.estado ?? p.estadoPedido))
}

/** @param {{ fechaCreacion?: string, fechaPedido?: string }} pedido */
export function pedidoEnPeriodo(pedido, desde, hasta) {
  const fecha = (pedido.fechaCreacion ?? pedido.fechaPedido ?? '').slice(0, 10)
  if (desde && fecha < desde) return false
  if (hasta && fecha > hasta) return false
  return true
}

/** @param {{ costoEnvio?: number }} pedido */
export function envioDePedido(pedido) {
  return pedido.costoEnvio ?? 0
}

/** @param {{ subtotal?: number, total?: number, totalPedido?: number, costoEnvio?: number }} pedido */
export function subtotalDePedido(pedido) {
  return pedido.subtotal ?? ((pedido.total ?? pedido.totalPedido ?? 0) - envioDePedido(pedido))
}

/** @param {{ total?: number, totalPedido?: number }} pedido */
export function totalDePedido(pedido) {
  return pedido.total ?? pedido.totalPedido ?? 0
}

/** @param {{ usuarioFinal?: { nombre?: string }, nombreCliente?: string }} pedido */
export function clienteDePedido(pedido) {
  return pedido.usuarioFinal?.nombre ?? pedido.nombreCliente ?? '—'
}

/** @param {{ fechaCreacion?: string, fechaPedido?: string }} pedido */
export function fechaDePedido(pedido) {
  return pedido.fechaCreacion ?? pedido.fechaPedido
}

/** @param {object[]} pedidos */
export function filasExportIngresos(pedidos) {
  return pedidos.map((pedido) => ({
    id: pedido.id,
    fecha: (pedido.fechaCreacion ?? pedido.fechaPedido ?? '').slice(0, 10),
    origen: pedido.origen ?? 'ONLINE',
    metodoPago: pedido.metodoPago,
    productos: subtotalDePedido(pedido),
    envio: envioDePedido(pedido),
    total: totalDePedido(pedido),
  }))
}

/** @param {string} [origen] */
export function estiloOrigen(origen) {
  const key = origen ?? 'ONLINE'
  return {
    backgroundColor: ORIGEN_BG[key] ?? 'rgba(255,255,255,0.06)',
    color: ORIGEN_COLOR[key] ?? '#A7B0BC',
  }
}

/** @param {number} parte @param {number} total */
export function porcentajeDe(parte, total) {
  if (total <= 0) return 0
  return ((parte / total) * 100).toFixed(0)
}
