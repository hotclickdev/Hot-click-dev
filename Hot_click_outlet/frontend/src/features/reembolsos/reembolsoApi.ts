import api from '@/services/api'
import { codigoError, mensajeErrorContrato } from '@/utils/erroresContrato'

/**
 * S5-21 · Pedir un reembolso (comprador). Rutas y validación reales en #202 (`docs/contratos/S5-esqueletos-pendientes-dueno.md`);
 * hasta que el dueño decida (S5-05) responden 501 `PENDIENTE_DECISION_DUENO` → «Todavía no disponible».
 *   GET  /api/pedidos/{id}/reembolso → { elegible: boolean, numero, tienda, fechaLimite: string|null,
 *        items: [{ id, nombre, monto }], solicitud: null | { estado, monto, fechaEstimada: string|null,
 *        actualizadoEl: string|null, pasos: [{ clave: 'ENVIADA'|'APROBADA'|'EN_PROCESO'|'ACREDITADO', fecha: string|null }] } }
 *   POST /api/pedidos/{id}/reembolso { itemIds: string[], motivo: Motivo, detalle?: string }
 * Plazo: lo decide el dueño (S5-05) y lo valida el backend; el front solo muestra `fechaLimite` si llega. La fecha estimada la informa ONVO.
 * Pendiente (S5-05): quién paga el envío de la devolución y si se devuelve la comisión.
 */
export const MOTIVOS = [
  { id: 'NO_LLEGO', texto: 'No llegó' },
  { id: 'LLEGO_DANADO', texto: 'Llegó dañado' },
  { id: 'NO_ES_LO_QUE_PEDI', texto: 'No es lo que pedí' },
  { id: 'OTRO', texto: 'Otro motivo' },
] as const
export type Motivo = typeof MOTIVOS[number]['id']

export type PasoReembolso = { clave: 'ENVIADA' | 'APROBADA' | 'EN_PROCESO' | 'ACREDITADO'; fecha: string | null }
export type Solicitud = { estado: string; monto: number; fechaEstimada: string | null; actualizadoEl: string | null; pasos: PasoReembolso[] }
export type DatosReembolso = { elegible: boolean; numero: string; tienda: string; fechaLimite: string | null; items: { id: string; nombre: string; monto: number }[]; solicitud: Solicitud | null }

const cuerpo = (data: unknown) => ((data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) ?? {}) as Record<string, unknown>
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const txt = (v: unknown) => (typeof v === 'string' && v ? v : null)
const CLAVES = ['ENVIADA', 'APROBADA', 'EN_PROCESO', 'ACREDITADO'] as const

export function normalizarReembolso(data: unknown): DatosReembolso {
  const d = cuerpo(data)
  const items = (Array.isArray(d.items) ? d.items : []).map((x) => { const i = (x ?? {}) as Record<string, unknown>; return { id: String(i.id ?? ''), nombre: txt(i.nombre) ?? '', monto: num(i.monto) } })
  const s = d.solicitud && typeof d.solicitud === 'object' ? (d.solicitud as Record<string, unknown>) : null
  const pasosRaw = s && Array.isArray(s.pasos) ? s.pasos : []
  const solicitud: Solicitud | null = s ? {
    estado: txt(s.estado) ?? 'ENVIADA', monto: num(s.monto), fechaEstimada: txt(s.fechaEstimada), actualizadoEl: txt(s.actualizadoEl),
    pasos: CLAVES.map((clave) => { const p = pasosRaw.find((x) => (x as { clave?: unknown })?.clave === clave) as { fecha?: unknown } | undefined; return { clave, fecha: txt(p?.fecha) } }),
  } : null
  return { elegible: d.elegible !== false, numero: txt(d.numero) ?? '', tienda: txt(d.tienda) ?? 'la tienda', fechaLimite: txt(d.fechaLimite), items, solicitud }
}

export const reembolsoApi = {
  obtener: (pedidoId: string) => api.get(`/pedidos/${encodeURIComponent(pedidoId)}/reembolso`).then((r) => normalizarReembolso(r.data)),
  pedir: (pedidoId: string, body: { itemIds: string[]; motivo: Motivo; detalle?: string }) => api.post(`/pedidos/${encodeURIComponent(pedidoId)}/reembolso`, body).then(() => undefined),
}

export function validarSolicitud(itemIds: string[], motivo: Motivo | null): { items?: string; motivo?: string } {
  const e: { items?: string; motivo?: string } = {}
  if (itemIds.length === 0) e.items = 'Elegí al menos un producto.'
  if (!motivo) e.motivo = 'Elegí un motivo para seguir.'
  return e
}

export function totalSeleccion(items: { id: string; monto: number }[], ids: string[]): number {
  return items.filter((i) => ids.includes(i.id)).reduce((s, i) => s + i.monto, 0)
}

export function textoActualizado(iso: string | null, ahora = Date.now()): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const min = Math.max(0, Math.round((ahora - t) / 60000))
  if (min < 1) return 'Actualizado recién'
  if (min < 60) return `Actualizado hace ${min} min`
  const h = Math.round(min / 60)
  return h < 24 ? `Actualizado hace ${h} h` : `Actualizado hace ${Math.round(h / 24)} d`
}

export function etiquetaPaso(clave: PasoReembolso['clave'], tienda: string): string {
  return { ENVIADA: 'Solicitud enviada', APROBADA: `Aprobada por ${tienda}`, EN_PROCESO: 'En proceso con ONVO', ACREDITADO: 'Acreditado' }[clave]
}

export const PLAZO_POR_DEFINIR = 'plazo a definir por HotClick'

/** «podés pedirlo hasta el …» solo con la fecha del backend; sin fecha no se inventa un plazo. */
export function textoPlazo(fechaLimite: string | null): string {
  return fechaLimite ? `podés pedirlo hasta el ${fechaLimite}` : PLAZO_POR_DEFINIR
}

const ERRORES_REEMBOLSO: Record<string, string> = {
  PEDIDO_NO_ENCONTRADO: 'No encontramos ese pedido.',
  SIN_ACCESO_PEDIDO: 'Este pedido no está en tu cuenta.',
  SIN_ITEMS: 'Elegí al menos un producto.',
  MOTIVO_INVALIDO: 'Elegí un motivo para seguir.',
}

/** Códigos de #202; si no es uno conocido, el texto de respaldo de la pantalla. */
export function mensajeErrorReembolso(err: unknown, respaldo: string): string {
  const contrato = mensajeErrorContrato(err)
  if (contrato) return contrato
  const code = codigoError(err)
  return (code && ERRORES_REEMBOLSO[code]) || respaldo
}
