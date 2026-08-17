export const TAMANO_PAGINA = 20

export const PROVEEDORES = ['', 'ONVO', 'STRIPE', 'SINPE']
export const ESTADOS_PAGO = ['', 'CAPTURADO', 'PENDIENTE', 'FALLIDO', 'CANCELADO']
export const ESTADOS_COMPROBANTE = ['', 'PENDIENTE', 'APROBADO', 'RECHAZADO']

export const COLUMNAS_EXPORT_PAGOS = ['id', 'pedidoId', 'proveedor', 'estado', 'monto', 'moneda', 'fecha']
export const COLUMNAS_EXPORT_WEBHOOKS = ['id', 'proveedor', 'evento', 'procesado', 'fecha']

export const BADGE = {
  CAPTURADO: 'bg-green-500/15 text-green-400 border-green-500/30',
  PENDIENTE: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  FALLIDO: 'bg-red-500/15 text-red-400 border-red-500/30',
  CANCELADO: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
}

export const BADGE_WH = {
  true: 'bg-green-500/15 text-green-400 border-green-500/30',
  false: 'bg-red-500/15 text-red-400 border-red-500/30',
}

/** @param {{ page: number, proveedor?: string, estadoPago?: string }} filtros */
export function queryPagos({ page, proveedor, estadoPago }) {
  const params = new URLSearchParams({ page, size: TAMANO_PAGINA })
  if (proveedor) params.set('proveedor', proveedor)
  if (estadoPago) params.set('estadoPago', estadoPago)
  return params.toString()
}

/** @param {{ page: number, procesado: string }} filtros */
export function queryWebhooks({ page, procesado }) {
  const params = new URLSearchParams({ page, size: TAMANO_PAGINA })
  if (procesado !== '') params.set('procesado', procesado)
  return params.toString()
}

/** @param {object[]} pagos */
export function filasExportPagos(pagos) {
  return pagos.map((p) => ({
    id: p.id,
    pedidoId: p.pedidoId ?? '',
    proveedor: p.proveedor ?? '',
    estado: p.estadoPago ?? '',
    monto: p.monto ?? 0,
    moneda: p.moneda ?? '',
    fecha: (p.fechaPago ?? p.createdAt ?? '').slice(0, 10),
  }))
}

/** @param {object[]} webhooks */
export function filasExportWebhooks(webhooks) {
  return webhooks.map((w) => ({
    id: w.id,
    proveedor: w.proveedor ?? '',
    evento: w.evento ?? '',
    procesado: w.procesado ? 'SI' : 'NO',
    fecha: (w.createdAt ?? '').slice(0, 10),
  }))
}

/** @param {string} estado */
export function claseEstadoComprobante(estado) {
  if (estado === 'PENDIENTE') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
  if (estado === 'APROBADO') return 'bg-green-500/15 text-green-400 border-green-500/30'
  return 'bg-red-500/15 text-red-400 border-red-500/30'
}
