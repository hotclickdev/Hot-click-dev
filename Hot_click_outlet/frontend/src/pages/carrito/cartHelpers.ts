import type { Producto, ProductoBackend } from '@/types/producto'
import type { ItemCarrito } from '@/types/carrito'
import { SHIPPING_COSTS, paquetesDesdeItems } from '@/pages/checkout/checkoutHelpers'
import type { ItemCheckout, PaqueteCheckout } from '@/pages/checkout/checkoutHelpers'

export const WHATSAPP_HOTCLICK = '50686667888'
export const FALLBACK_CATALOGO_SIZE = 12
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

/** Un paquete del carrito: los productos de una misma bodega/vendedor, con su envío estimado. */
export type PaqueteCarrito = {
  clave: string
  negocio: string
  items: ItemCarrito[]
  subtotal: number
  /** Envío normal estimado; el método definitivo se elige en el checkout. */
  envio: number
  /** Checkout: método de envío elegido para el paquete. */
  metodo?: string
  /** Checkout: el costo lo cobra la empresa de encomienda, no HotClick. */
  envioVaria?: boolean
}

/** Paquetes del checkout con el envío del método elegido en cada uno (resumen de Figma `29:1408`, `30:2492`). */
export function paquetesConEnvioElegido(paquetes: PaqueteCheckout[], metodos: Record<string, string>): PaqueteCarrito[] {
  return paquetes.map((paquete) => {
    const metodo = metodos[paquete.bodegaId] ?? 'ENVIO_NORMAL_GAM'
    return {
      clave: paquete.bodegaId,
      negocio: paquete.empresaNombre || paquete.bodegaNombre,
      items: paquete.items as ItemCarrito[],
      subtotal: paquete.subtotal,
      envio: SHIPPING_COSTS[metodo] ?? 0,
      metodo,
      envioVaria: metodo === 'ENCOMIENDA_PROPIA',
    }
  })
}

/** Agrupa el carrito por paquete (misma regla del checkout) y estima el envío normal de cada uno. */
export function paquetesDelCarrito(items: ItemCarrito[]): PaqueteCarrito[] {
  return paquetesDesdeItems(items as ItemCheckout[]).map((paquete) => ({
    clave: paquete.bodegaId,
    negocio: paquete.empresaNombre || paquete.bodegaNombre,
    items: paquete.items as ItemCarrito[],
    subtotal: paquete.subtotal,
    envio: SHIPPING_COSTS.ENVIO_NORMAL_GAM,
  }))
}

export function totalEnvioEstimado(paquetes: PaqueteCarrito[]): number {
  return paquetes.reduce((suma, paquete) => suma + paquete.envio, 0)
}

/** Productos sugeridos de la misma tienda de un paquete que aún no están en el carrito. */
export function sugerenciaDeLaTienda(paquete: PaqueteCarrito, candidatos: Producto[], idsEnCarrito: Set<Producto['id']>): Producto | null {
  return candidatos.find((p) => (
    !idsEnCarrito.has(p.id) && p.stock > 0 && Boolean(p.empresaNombre) && p.empresaNombre === paquete.negocio
  )) ?? null
}
