import api from '@/services/api'

/** Reembolso por ONVO (POST /api/admin/pedidos/{id}/reembolso-onvo). Solo ADMIN de plataforma. */
export const reembolsoOnvoService = {
  reembolsar: (pedidoId: string) => api.post(`/admin/pedidos/${pedidoId}/reembolso-onvo`),
}

export const REEMBOLSO_CONFIRMACION = {
  titulo: '¿Devolvés el pago por ONVO?',
  texto: 'Se le devuelve el total al cliente por ONVO, el pedido queda cancelado y el stock vuelve al inventario. No se puede deshacer.',
  cta: 'Sí, reembolsar',
}

export const REEMBOLSO_ERROR = 'No se pudo pedir el reembolso. Revisá en ONVO antes de reintentar.'

export function puedeReembolsarOnvo(rol: string | null | undefined): boolean {
  return rol === 'ADMIN'
}

/** Mensaje del servidor (ya viene con voseo) o uno genérico; sirve para éxito y para error. */
export function mensajeReembolso(r: unknown, fallback = REEMBOLSO_ERROR): string {
  const o = r as { data?: { message?: unknown }; response?: { data?: { message?: unknown } } } | null
  const m = o?.data?.message ?? o?.response?.data?.message
  return typeof m === 'string' && m.trim() ? m : fallback
}
