/**
 * Tope de unidades por producto para invitados en la tienda propia (/tienda/:slug).
 *
 * Espejo de `GuestCheckoutGuard` del backend (`hotclick.checkout.invitado.max-unidades-por-producto`,
 * default 3; ver también `StorefrontPedidoDTO`). El backend no expone ese valor en ningún endpoint
 * público, así que el front usa el mismo default en esta única constante. Si se cambia la propiedad
 * en el servidor, hay que cambiar esto también (pendiente: exponerlo en un endpoint público de config).
 * El backend sigue siendo quien decide: si el valor difiere, responde 429 con su propio mensaje.
 */
export const TOPE_UNIDADES_INVITADO = 3

/** Mismo texto que `GuestCheckoutGuard.MSG_TOPE_PRODUCTO`. */
export function mensajeTopeInvitado(tope: number = TOPE_UNIDADES_INVITADO): string {
  return `Como invitado podés reservar hasta ${tope} unidades de un mismo producto. Iniciá sesión para comprar más.`
}

/** Máximo que se puede elegir: el stock y, si es invitado, el tope. */
export function maxCantidadTienda(stock: number, invitado: boolean): number {
  return invitado ? Math.min(stock, TOPE_UNIDADES_INVITADO) : stock
}

/** Recorta una cantidad al tope del invitado (los usuarios con sesión no tienen este tope). */
export function limitarCantidadInvitado(cantidad: number, invitado: boolean): number {
  return invitado ? Math.min(cantidad, TOPE_UNIDADES_INVITADO) : cantidad
}

/** True si el invitado ya llegó al tope (y no por falta de stock): ahí se muestra el aviso. */
export function llegoAlTopeInvitado(cantidad: number, stock: number, invitado: boolean): boolean {
  return invitado && cantidad >= TOPE_UNIDADES_INVITADO && stock >= TOPE_UNIDADES_INVITADO
}
