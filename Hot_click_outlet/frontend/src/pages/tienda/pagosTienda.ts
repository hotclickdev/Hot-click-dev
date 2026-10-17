/**
 * Decisión HOT_CLICK 16-oct-2026: el SINPE con comprobante de la tienda propia queda oculto hasta que
 * ONVO esté en vivo. El backend rechaza SINPE_MOVIL con 400 mientras
 * `hotclick.checkout.sinpe-manual.habilitado` siga en false.
 */
export const SINPE_TIENDA_DISPONIBLE = false

export type OpcionPago = { value: string; label: string }

export const PAGO_SINPE: OpcionPago = { value: 'SINPE_MOVIL', label: 'SINPE / Tarjeta' }
export const PAGO_EFECTIVO: OpcionPago = { value: 'EFECTIVO', label: 'Efectivo al recibir' }

export function metodosPagoTienda(aceptaEfectivo: boolean, sinpeDisponible = SINPE_TIENDA_DISPONIBLE): OpcionPago[] {
  const lista: OpcionPago[] = []
  if (sinpeDisponible) lista.push(PAGO_SINPE)
  if (aceptaEfectivo) lista.push(PAGO_EFECTIVO)
  return lista
}

/** El método elegido si sigue disponible; si no, el primero (o '' si no hay ninguno). */
export function metodoPagoVigente(actual: string, opciones: OpcionPago[]): string {
  return opciones.some((o) => o.value === actual) ? actual : (opciones[0]?.value ?? '')
}

export const AVISO_SIN_METODOS_PAGO =
  'Esta tienda todavía no recibe pagos en línea. Escribile a la tienda para coordinar tu compra.'
