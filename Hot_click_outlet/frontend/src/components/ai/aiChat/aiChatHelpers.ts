import type { Producto } from '@/types/producto'

/** Payload de producto que manda el SSE del chat (snake_case y camelCase). */
export type AiProductPayload = {
  id_producto?: number
  id?: number
  nombre_producto?: string
  nombre?: string
  descripcion_corta?: string
  descripcionCorta?: string
  precio_venta?: number
  precio?: number
  precio_oferta?: number
  precioOferta?: number | null
  imagen_principal_url?: string
  imagenUrl?: string
  sku?: string
  stock_actual?: number
  stock?: number
  similarity?: number
  es_personalizado?: boolean
  esPersonalizado?: boolean
  modo_precio_personalizado?: string
  modoPrecioPersonalizado?: string
  precio_personalizado_min?: number
  precioPersonalizadoMin?: number
  precio_personalizado_max?: number
  precioPersonalizadoMax?: number
  instrucciones_personalizacion?: string
  instruccionesPersonalizacion?: string
  precio_etiqueta?: string
  precioEtiqueta?: string
}

/** Producto canónico más el score de similitud del chat. */
export type AiChatProducto = Producto & {
  similarity?: number
  precioEtiqueta?: string | null
}

export type AiChatMensaje = {
  rol?: string
  texto?: string
  typing?: boolean
  failed?: boolean
  failedQuery?: string
  productos?: AiChatProducto[]
  categorias?: string[]
  opts?: string[]
}

export function normalizeProduct(p: AiProductPayload): AiChatProducto {
  const esPersonalizado = p.es_personalizado ?? p.esPersonalizado ?? false
  const modo = p.modo_precio_personalizado ?? p.modoPrecioPersonalizado ?? null
  const min = p.precio_personalizado_min ?? p.precioPersonalizadoMin ?? null
  const max = p.precio_personalizado_max ?? p.precioPersonalizadoMax ?? null
  const precioRaw = p.precio_venta ?? p.precio
  const precioOferta = p.precio_oferta ?? p.precioOferta ?? null
  const precioEtiqueta = p.precio_etiqueta ?? p.precioEtiqueta ?? null
  const precio =
    esPersonalizado && modo === 'COTIZACION'
      ? 0
      : esPersonalizado && modo === 'RANGO' && min != null
        ? min
        : (precioRaw ?? 0)

  return {
    id:             p.id_producto    ?? p.id,
    nombre:         p.nombre_producto ?? p.nombre,
    descripcionCorta: p.descripcion_corta ?? p.descripcionCorta,
    precio,
    precioOferta:   esPersonalizado && modo !== 'FIJO' ? null : precioOferta,
    imagenUrl:      p.imagen_principal_url ?? p.imagenUrl,
    sku:            p.sku            ?? '',
    stock:          p.stock_actual   ?? p.stock ?? 99,
    similarity:     p.similarity,
    esPersonalizado,
    modoPrecioPersonalizado: modo,
    precioPersonalizadoMin: min,
    precioPersonalizadoMax: max,
    instruccionesPersonalizacion: p.instrucciones_personalizacion ?? p.instruccionesPersonalizacion ?? null,
    precioEtiqueta,
  } as unknown as AiChatProducto
}

/** Detects if current time is outside Costa Rica business hours (8am–8pm). */
export function isAfterHours() {
  const crHour = new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica', hour: 'numeric', hour12: false })
  const h = Number.parseInt(crHour, 10)
  return h < 8 || h >= 20
}

export const removeMsg = (msg: AiChatMensaje) => (list: AiChatMensaje[]) => list.filter(x => x !== msg)

export const MSG_CSS_ID = 'hc-ai-msg-css'

if (typeof document !== 'undefined' && !document.getElementById(MSG_CSS_ID)) {
  const s = document.createElement('style')
  s.id = MSG_CSS_ID
  s.textContent = `@keyframes ai-msg-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`
  document.head.appendChild(s)
}
