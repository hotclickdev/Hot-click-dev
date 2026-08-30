import type { Producto, ProductoBackend } from '@/types/producto'

export const WHATSAPP_HOTCLICK = '50686667888'
export const EMAIL_PROMPT_DELAY_MS = 45_000
export const CROSS_SELL_LIMITE = 4
export const FALLBACK_CATALOGO_SIZE = 12
export const CROSS_ADDED_FEEDBACK_MS = 1_400
export const EMAIL_GUARDADO_OCULTAR_MS = 1_800
export const STOCK_MAX_VISIBLE = 99

export const KEY_EMAIL_CARRITO = 'hc-cart-email'

export function listaProductosDesdeRespuesta(data: unknown): ProductoBackend[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is ProductoBackend => typeof item === 'object' && item !== null)
  }
  if (data && typeof data === 'object' && 'content' in data) {
    const content = (data as { content: unknown }).content
    if (Array.isArray(content)) {
      return content.filter((item): item is ProductoBackend => typeof item === 'object' && item !== null)
    }
  }
  return []
}

export function seleccionarCrossSell(
  productos: Producto[],
  idsEnCarrito: Set<Producto['id']>,
  limite = CROSS_SELL_LIMITE,
): Producto[] {
  return productos
    .filter((producto) => !idsEnCarrito.has(producto.id) && producto.stock > 0)
    .slice(0, limite)
}

export function imagenItemCarrito(item: { imagenUrl?: string; imagenPrincipalUrl?: string }): string | undefined {
  return item.imagenUrl ?? item.imagenPrincipalUrl
}

export function subtotalItem(item: { precio?: number; cantidad: number }): number {
  return (item.precio ?? 0) * item.cantidad
}

export function urlWhatsApp(textoEncoded: string, numero = WHATSAPP_HOTCLICK): string {
  return `https://wa.me/${numero}?text=${textoEncoded}`
}

export function emailCarritoYaCapturado(): boolean {
  return Boolean(localStorage.getItem(KEY_EMAIL_CARRITO))
}

export function guardarEmailCarritoLocal(email: string): void {
  localStorage.setItem(KEY_EMAIL_CARRITO, email)
}
