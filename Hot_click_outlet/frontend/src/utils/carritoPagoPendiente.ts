import { paymentService } from '@/services/paymentService'

/**
 * QA7-E1: el carrito solo se vaciaba en la página de éxito. Si el retorno del proveedor no carga
 * (p. ej. una URL de retorno mal configurada), el pedido queda pagado y el carrito lleno.
 * Antes de redirigir a la pasarela guardamos el número de pedido (sessionStorage de la pestaña) y,
 * al volver a cargar la app, consultamos el estado: CAPTURADO vacía el carrito; CANCELADO/FALLIDO
 * o una marca vieja solo la borran; PENDIENTE la deja para la próxima vez.
 */
export const CLAVE_PAGO_PENDIENTE = 'hc-carrito-pago-pendiente'
const VIGENCIA_MS = 24 * 60 * 60 * 1000

type Marca = { numeroPedido: string; desde: number }

export function marcarPagoPendiente(numeroPedido: string, ahora: number = Date.now()) {
  try {
    sessionStorage.setItem(CLAVE_PAGO_PENDIENTE, JSON.stringify({ numeroPedido, desde: ahora }))
  } catch {
    // almacenamiento no disponible: queda el camino normal de la página de éxito
  }
}

export function olvidarPagoPendiente() {
  try { sessionStorage.removeItem(CLAVE_PAGO_PENDIENTE) } catch { /* sin almacenamiento */ }
}

function leerMarca(): Marca | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE_PAGO_PENDIENTE)
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
