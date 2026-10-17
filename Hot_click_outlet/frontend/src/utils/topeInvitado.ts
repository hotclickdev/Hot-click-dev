import { useEffect } from 'react'
import { create } from 'zustand'
import api from '@/services/api'

/**
 * Tope de unidades por producto para invitados en la tienda propia (/tienda/:slug).
 *
 * Se lee de GET /api/public/checkout-config, campo `maxUnidadesPorProducto` (rama
 * feat/config-publica-max-unidades, espejo de `hotclick.checkout.invitado.max-unidades-por-producto`
 * de GuestCheckoutGuard). Si no viene o es inválido, se usa el respaldo de 3 (default del backend).
 * El backend sigue siendo quien decide: si el valor difiere, responde 429 con su propio mensaje.
 */
export const TOPE_UNIDADES_INVITADO = 3

export function topeDesdeConfig(data: unknown): number {
  const d = (data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) as { maxUnidadesPorProducto?: unknown } | null
  const v = d?.maxUnidadesPorProducto
  return typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : TOPE_UNIDADES_INVITADO
}

type EstadoTope = { tope: number; cargado: boolean; cargar: () => Promise<void> }

let pedido: Promise<void> | null = null
export const useTopeInvitadoStore = create<EstadoTope>((set) => ({
  tope: TOPE_UNIDADES_INVITADO,
  cargado: false,
  cargar: () => {
    pedido ??= api.get('/public/checkout-config')
      .then((r) => set({ tope: topeDesdeConfig(r.data), cargado: true }))
      .catch(() => set({ tope: TOPE_UNIDADES_INVITADO, cargado: true }))
    return pedido
  },
}))

/** Tope vigente (config o respaldo). */
export function topeInvitado(): number {
  return useTopeInvitadoStore.getState().tope
}

/** Hook para las pantallas: dispara la carga una vez y re-renderiza cuando llega. */
export function useTopeInvitado(): number {
  const tope = useTopeInvitadoStore((s) => s.tope)
  const cargar = useTopeInvitadoStore((s) => s.cargar)
  useEffect(() => { void cargar() }, [cargar])
  return tope
}

/** Mismo texto que `GuestCheckoutGuard.MSG_TOPE_PRODUCTO`. */
export function mensajeTopeInvitado(tope: number = topeInvitado()): string {
  return `Como invitado podés reservar hasta ${tope} unidades de un mismo producto. Iniciá sesión para comprar más.`
}

/** Máximo que se puede elegir: el stock y, si es invitado, el tope. */
export function maxCantidadTienda(stock: number, invitado: boolean): number {
  return invitado ? Math.min(stock, topeInvitado()) : stock
}

/** Recorta una cantidad al tope del invitado (los usuarios con sesión no tienen este tope). */
export function limitarCantidadInvitado(cantidad: number, invitado: boolean): number {
  return invitado ? Math.min(cantidad, topeInvitado()) : cantidad
}

/** True si el invitado ya llegó al tope (y no por falta de stock): ahí se muestra el aviso. */
export function llegoAlTopeInvitado(cantidad: number, stock: number, invitado: boolean): boolean {
  const tope = topeInvitado()
  return invitado && cantidad >= tope && stock >= tope
}
