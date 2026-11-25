import type { Producto } from '@/types/producto'
import { topeStock } from '@/utils/stock'

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
  /** Nombre del negocio, si el backend lo manda. */
  empresa_nombre?: string
  empresaNombre?: string
  /** Slug para el enlace /tienda/{slug}. */
  empresa_slug?: string
  empresaSlug?: string
}

/** Producto canónico más el score de similitud del chat. */
export type AiChatProducto = Producto & {
  similarity?: number
  precioEtiqueta?: string | null
}

/** Botón que arma el backend (p. ej. al agotarse el cupo diario). El front solo lo pinta. */
export type AiChatAccion = {
  tipo?: string
  label?: string
  url?: string
  /** AGREGAR_CARRITO: producto validado por el backend y unidades. */
  productoId?: number
  cantidad?: number
}

export const CANTIDAD_MAXIMA_CARRITO = 10

export type AccionCarrito = { producto: AiChatProducto; cantidad: number }

/**
 * Acciones AGREGAR_CARRITO del asesor: solo las bien formadas (id entero, 1 a 10 unidades) cuyo producto vino en el
 * mismo mensaje. El backend nunca toca el carrito: la persona aprieta el botón y el front aplica la acción.
 */
export function accionesCarrito(m: AiChatMensaje): AccionCarrito[] {
  const salida: AccionCarrito[] = []
  for (const a of m.acciones ?? []) {
    if (a?.tipo !== 'AGREGAR_CARRITO') continue
    const id = a.productoId
    const cantidad = a.cantidad
    if (!Number.isInteger(id) || (id as number) <= 0) continue
    if (!Number.isInteger(cantidad) || (cantidad as number) < 1 || (cantidad as number) > CANTIDAD_MAXIMA_CARRITO) continue
    const producto = m.productos?.find(p => p.id === id)
    if (producto) salida.push({ producto, cantidad: cantidad as number })
  }
  return salida
}

/** Solo rutas internas ("/…") o wa.me por https; cualquier otra URL se descarta. */
export function accionSegura(a: AiChatAccion | null | undefined): { tipo: 'buscar' | 'whatsapp'; label: string; url: string } | null {
  if (!a || typeof a.url !== 'string' || typeof a.label !== 'string' || !a.label.trim()) return null
  const url = a.url.trim()
  if (a.tipo === 'whatsapp') {
    return /^https:\/\/wa\.me\/\d{6,15}$/.test(url) ? { tipo: 'whatsapp', label: a.label.trim(), url } : null
  }
  if (a.tipo === 'buscar') {
    return /^\/(?!\/)[\w\-./]*$/.test(url) ? { tipo: 'buscar', label: a.label.trim(), url } : null
  }
  return null
}

export function accionesSeguras(acciones: AiChatAccion[] | undefined) {
  return (acciones ?? []).map(accionSegura).filter((a): a is NonNullable<ReturnType<typeof accionSegura>> => a !== null)
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
  acciones?: AiChatAccion[]
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
    stock:          topeStock(p.stock_actual ?? p.stock),
    similarity:     p.similarity,
    esPersonalizado,
    modoPrecioPersonalizado: modo,
    precioPersonalizadoMin: min,
    precioPersonalizadoMax: max,
    instruccionesPersonalizacion: p.instrucciones_personalizacion ?? p.instruccionesPersonalizacion ?? null,
    precioEtiqueta,
    empresaNombre:  p.empresa_nombre ?? p.empresaNombre ?? null,
    empresaSlug:    p.empresa_slug ?? p.empresaSlug ?? null,
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
