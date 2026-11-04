import { paymentService } from '@/services/paymentService'

/**
 * QA7-E1: el carrito solo se vaciaba en la página de éxito. Si el retorno del proveedor no carga
 * (p. ej. una URL de retorno mal configurada), el pedido queda pagado y el carrito lleno.
 * Antes de redirigir a la pasarela guardamos el número de pedido (sessionStorage de la pestaña) y,
 * al volver a cargar la app, consultamos el estado: CAPTURADO vacía el carrito; CANCELADO/FALLIDO
 * o una marca vieja solo la borran; PENDIENTE la deja para la próxima vez.
 * BAJO: la marca va en localStorage (compartido entre pestañas). Con sessionStorage, si el retorno de la
 * pasarela abría otra pestaña, esa pestaña no veía la marca y el carrito de la original nunca se vaciaba.
 * Además las otras pestañas abiertas releen el carrito cuando cambia (evento `storage`).
 */
export const CLAVE_PAGO_PENDIENTE = 'hc-carrito-pago-pendiente'
const VIGENCIA_MS = 24 * 60 * 60 * 1000
/** Clave del carrito persistido (zustand persist en cartStore). */
export const CLAVE_CARRITO = 'hotclick-cart'

function compartido(): Storage | null {
  try { return globalThis.localStorage ?? null } catch { return null }
}
function dePestana(): Storage | null {
  try { return globalThis.sessionStorage ?? null } catch { return null }
}

type Marca = { numeroPedido: string; desde: number }

export function marcarPagoPendiente(numeroPedido: string, ahora: number = Date.now()) {
  try {
    compartido()?.setItem(CLAVE_PAGO_PENDIENTE, JSON.stringify({ numeroPedido, desde: ahora }))
  } catch {
    // almacenamiento no disponible: queda el camino normal de la página de éxito
  }
}

export function olvidarPagoPendiente() {
  try { compartido()?.removeItem(CLAVE_PAGO_PENDIENTE) } catch { /* sin almacenamiento */ }
  // marca vieja de antes del cambio (por pestaña)
  try { dePestana()?.removeItem(CLAVE_PAGO_PENDIENTE) } catch { /* sin almacenamiento */ }
}

function leerMarca(): Marca | null {
  try {
    const crudo = compartido()?.getItem(CLAVE_PAGO_PENDIENTE) ?? dePestana()?.getItem(CLAVE_PAGO_PENDIENTE) ?? null
    if (!crudo) return null
    const m = JSON.parse(crudo) as Partial<Marca>
    return typeof m.numeroPedido === 'string' && typeof m.desde === 'number' ? (m as Marca) : null
  } catch {
    return null
  }
}

/** Devuelve true si vació el carrito. Nunca lanza. */
export async function revisarPagoPendiente(clearCart: () => void, ahora: number = Date.now()): Promise<boolean> {
  const marca = leerMarca()
  if (!marca) { olvidarPagoPendiente(); return false }
  if (ahora - marca.desde > VIGENCIA_MS) { olvidarPagoPendiente(); return false }
  try {
    const { data } = await paymentService.consultarEstado(marca.numeroPedido)
    const e = data?.estadoPago
    if (e === 'CAPTURADO') { clearCart(); olvidarPagoPendiente(); return true }
    if (e === 'CANCELADO' || e === 'FALLIDO') olvidarPagoPendiente()
  } catch {
    // error de red o sin permiso: reintenta en la próxima carga hasta que venza la marca
  }
  return false
}

type ObjetivoEventos = Pick<Window, 'addEventListener' | 'removeEventListener'>

/**
 * BAJO: si otra pestaña (p. ej. el retorno del pago) vació o cambió el carrito, esta pestaña lo relee del
 * almacenamiento; si no, su copia en memoria seguiría mostrando los productos y los volvería a guardar.
 * Devuelve la función para dejar de escuchar.
 */
export function escucharCarritoEntrePestanas(
  releer: () => void,
  objetivo: ObjetivoEventos | undefined = typeof window === 'undefined' ? undefined : window,
): () => void {
  if (!objetivo) return () => {}
  const alCambiar = (e: Event) => {
    const clave = (e as StorageEvent).key
    if (clave === CLAVE_CARRITO || clave === null) releer()
  }
  objetivo.addEventListener('storage', alCambiar)
  return () => objetivo.removeEventListener('storage', alCambiar)
}
