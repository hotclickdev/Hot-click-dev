import { create } from 'zustand'

/** Código que el backend devuelve (403) a un negocio SUSPENDIDO_IMPAGO fuera de cuenta/pago. */
export const CODIGO_SUSCRIPCION_IMPAGA = 'SUSCRIPCION_IMPAGA'
export const ESTADO_SUSPENDIDO_IMPAGO = 'SUSPENDIDO_IMPAGO'
/** Única pantalla del panel para una tienda suspendida. */
export const RUTA_CUENTA_SUSPENDIDA = '/cuenta-suspendida'

/** True si un error de axios es el 403 de suscripción impaga. */
export function esErrorSuscripcionImpaga(err: unknown): boolean {
  if (!err || typeof err !== 'object' || !('response' in err)) return false
  const res = (err as { response?: { status?: number; data?: unknown } }).response
  if (res?.status !== 403 || !res.data || typeof res.data !== 'object') return false
  const d = res.data as { codigo?: unknown; data?: { codigo?: unknown } }
  return d.codigo === CODIGO_SUSCRIPCION_IMPAGA || d.data?.codigo === CODIGO_SUSCRIPCION_IMPAGA
}

/** Rutas que siguen accesibles con la tienda suspendida (salir y volver a entrar). */
const RUTAS_LIBRES = [RUTA_CUENTA_SUSPENDIDA, '/login', '/recuperar-contrasena', '/sso-callback', '/sso-complete']

/** A dónde mandar al dueño suspendido desde `pathname` (null = quedarse). */
export function destinoSuspension(suspendida: boolean, pathname: string): string | null {
  if (!suspendida) return null
  return RUTAS_LIBRES.some((r) => pathname === r || pathname.startsWith(`${r}/`)) ? null : RUTA_CUENTA_SUSPENDIDA
}

/** Respuesta de GET /billing/impago. */
export type EstadoImpago = {
  suspendida: boolean
  nombreEmpresa?: string | null
  correoEmpresa?: string | null
  fechaVencPlan?: string | null
  planPendiente?: string | null
  montoPendiente?: number | null
  moneda?: string | null
  /** Extensión de admin vigente: gestiona solo los pedidos creados en la gracia. */
  enExtension?: boolean
  extensionVenceEn?: string | null
}

export type PedidoDeGracia = {
  id: number
  numeroPedido?: string | null
  estadoPedido?: string | null
  totalPedido?: number | null
  numeroGuia?: string | null
  fechaPedido?: string | null
}

/** Estados a los que el dueño puede mover un pedido de la gracia durante la extensión. */
export const ESTADOS_GESTION_GRACIA = ['EN_PREPARACION', 'ENVIADO', 'ENTREGADO'] as const

type SuspensionState = { suspendida: boolean; marcar: (v: boolean) => void }

export const useSuspensionStore = create<SuspensionState>((set) => ({
  suspendida: false,
  marcar: (v) => set({ suspendida: v }),
}))
