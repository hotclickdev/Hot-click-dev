/**
 * Tienda pausada al vencer la gracia · handoff /workspace/diseno/extra/HANDOFF_DEV.md §2.
 * CONTRATO (backend feat/pausa-cobros-tienda): una tienda pausada responde **410** con
 *   { "code": "TIENDA_PAUSADA", ...opcional: tienda: {nombreComercial, logoUrl, ...}, productos: [...], producto: {...} }
 * en /api/tienda/{slug}/** (info, productos, ficha, carrito/checkout). El backend ya la saca de destacados
 * y rechaza el carrito/checkout. Si manda `productos`, se muestran como AGOTADO; si no, quedan ocultos.
 * Las ventas que ya existen siguen su curso. El front solo refleja el estado del servidor.
 */
export const CODIGO_TIENDA_PAUSADA = 'TIENDA_PAUSADA'
export const AVISO_TIENDA_PAUSADA = 'Esta tienda no está recibiendo pedidos por ahora.'
export const BOTON_NO_DISPONIBLE = 'No disponible por ahora'
export const CHIP_AGOTADO = 'AGOTADO'

type ErrAxios = { response?: { status?: number; data?: unknown } }

function cuerpo(err: unknown): Record<string, unknown> | null {
  const d = (err as ErrAxios | null)?.response?.data
  return d && typeof d === 'object' ? (d as Record<string, unknown>) : null
}

export function esTiendaPausada(err: unknown): boolean {
  const r = (err as ErrAxios | null)?.response
  if (r?.status !== 410) return false
  const c = cuerpo(err)
  const code = c?.code ?? (c?.data as Record<string, unknown> | undefined)?.code
  return code === CODIGO_TIENDA_PAUSADA
}

function campo(err: unknown, nombre: string): unknown {
  const c = cuerpo(err)
  return c?.[nombre] ?? (c?.data as Record<string, unknown> | undefined)?.[nombre]
}

/** Datos públicos de la tienda que vengan en el 410 (nombre, logo); nunca redes ni contacto. */
export function infoTiendaPausada<T extends object>(err: unknown, slug: string): T & { pausada: true } {
  const t = campo(err, 'tienda')
  const base = t && typeof t === 'object' ? { ...(t as object) } : { nombreComercial: slug }
  for (const k of ['instagram', 'whatsapp', 'facebook', 'tiktok', 'contactoDirecto', 'redes']) delete (base as Record<string, unknown>)[k]
  return { ...(base as T), pausada: true }
}

/** Productos que el backend decide mostrar (como AGOTADO). Sin el campo: ocultos. */
export function productosTiendaPausada<T>(err: unknown): T[] {
  const p = campo(err, 'productos')
  const lista = Array.isArray(p) ? p : (p && typeof p === 'object' && Array.isArray((p as { content?: unknown }).content) ? (p as { content: unknown[] }).content : [])
  return lista as T[]
}

export function productoTiendaPausada<T>(err: unknown): T | null {
  const p = campo(err, 'producto')
  return p && typeof p === 'object' ? (p as T) : null
}
