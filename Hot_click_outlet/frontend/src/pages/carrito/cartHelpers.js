export const WHATSAPP_HOTCLICK = '50686667888'
export const EMAIL_PROMPT_DELAY_MS = 45_000
export const CROSS_SELL_LIMITE = 4
export const FALLBACK_CATALOGO_SIZE = 12
export const CROSS_ADDED_FEEDBACK_MS = 1_400
export const EMAIL_GUARDADO_OCULTAR_MS = 1_800
export const STOCK_MAX_VISIBLE = 99

export const KEY_EMAIL_CARRITO = 'hc-cart-email'

/** @param {unknown} data */
export function listaProductosDesdeRespuesta(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  return []
}

/**
 * @param {{ id: number, stock?: number }[]} productos
 * @param {Set<number>} idsEnCarrito
 */
export function seleccionarCrossSell(productos, idsEnCarrito, limite = CROSS_SELL_LIMITE) {
  return productos
    .filter((producto) => !idsEnCarrito.has(producto.id) && producto.stock > 0)
    .slice(0, limite)
}

/** @param {{ imagenUrl?: string, imagenPrincipalUrl?: string }} item */
export function imagenItemCarrito(item) {
  return item.imagenUrl ?? item.imagenPrincipalUrl
}

/** @param {{ precio?: number, cantidad: number }} item */
export function subtotalItem(item) {
  return (item.precio ?? 0) * item.cantidad
}

export function urlWhatsApp(textoEncoded, numero = WHATSAPP_HOTCLICK) {
  return `https://wa.me/${numero}?text=${textoEncoded}`
}

export function emailCarritoYaCapturado() {
  return Boolean(localStorage.getItem(KEY_EMAIL_CARRITO))
}

export function guardarEmailCarritoLocal(email) {
  localStorage.setItem(KEY_EMAIL_CARRITO, email)
}
