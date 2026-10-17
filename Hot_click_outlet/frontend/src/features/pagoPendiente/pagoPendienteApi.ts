import api from '@/services/api'

/**
 * S4-22 · Pago pendiente SINPE de ONVO. Contrato real de #207 (`docs/contratos/S4-22-estado-pago-publico.md`).
 * El token es `estadoPagoToken` (del checkout; distinto del `cancelToken`). Token inválido o pedido inexistente → 404.
 *
 *   GET /api/public/pedidos/{numero}/estado-pago?token=…  →
 *     { estado: 'PENDIENTE'|'CONFIRMADO'|'VENCIDO', numero, tienda, correo, cantidadProductos,
 *       subtotal, envioEtiqueta, envio, total, reservadoHasta: string|null }
 * `reservadoHasta`: ISO con zona CR, o null si no hay plazo configurado (`hotclick.sinpe.plazo-minutos` sin valor):
 * con null la UI no muestra ningún plazo. CANCELADO y FALLIDO llegan como VENCIDO. Montos: todos vienen del backend.
 */
export type EstadoPago = 'PENDIENTE' | 'CONFIRMADO' | 'VENCIDO'

export type PagoPendiente = {
  estado: EstadoPago
  numero: string
  tienda: string
  correo: string | null
  cantidadProductos: number
  subtotal: number
  envioEtiqueta: string | null
  envio: number
  total: number
  reservadoHasta: string | null
}

const ESTADOS: EstadoPago[] = ['PENDIENTE', 'CONFIRMADO', 'VENCIDO']

export function normalizarPago(data: unknown): PagoPendiente {
  const d = ((data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) ?? {}) as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  const txt = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  return {
    estado: ESTADOS.includes(d.estado as EstadoPago) ? (d.estado as EstadoPago) : 'PENDIENTE',
    numero: txt(d.numero) ?? '',
    tienda: txt(d.tienda) ?? 'la tienda',
    correo: txt(d.correo),
    cantidadProductos: num(d.cantidadProductos),
    subtotal: num(d.subtotal),
    envioEtiqueta: txt(d.envioEtiqueta),
    envio: num(d.envio),
    total: num(d.total),
    reservadoHasta: txt(d.reservadoHasta),
  }
}

export const pagoPendienteApi = {
  estado: (numero: string, token?: string | null) =>
    api.get(`/public/pedidos/${encodeURIComponent(numero)}/estado-pago`, { params: token ? { token } : undefined }).then((r) => normalizarPago(r.data)),
}

/** Cada cuánto se consulta mientras está pendiente. */
export const INTERVALO_CONSULTA_MS = 10_000
