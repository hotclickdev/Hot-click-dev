/**
 * Pago en el checkout (decisión HOT_CLICK 16-oct-2026): sin SINPE manual con comprobante.
 * Dos botones que llevan a la pasarela (SINPE Móvil y Tarjeta) y efectivo contra entrega.
 * La pasarela es neutral: hoy Tilopay; cuando se migre a ONVO cambia solo `proveedorPasarela`.
 */
export const PAGO_SINPE = 'PASARELA_SINPE'
export const PAGO_TARJETA = 'PASARELA_TARJETA'
export const PAGO_EFECTIVO = 'EFECTIVO'

export function proveedorPasarela(): string {
  return 'TILOPAY'
}

/** Valor que viaja como `provider` al API. */
export function proveedorDe(metodoUi: string): string {
  return metodoUi === PAGO_EFECTIVO ? PAGO_EFECTIVO : proveedorPasarela()
}

/** Compat: método con el que abre el checkout. */
export function metodoPagoPrincipal(): string {
  return PAGO_SINPE
}

type ItemConBodega = { bodega?: { aceptaEfectivo?: boolean } | null; bodegaAceptaEfectivo?: boolean }

/** Efectivo solo si todos los negocios del carrito lo aceptan. */
export function efectivoDisponible(items: ItemConBodega[]): boolean {
  return items.length > 0 && items.every((i) => (i.bodegaAceptaEfectivo ?? i.bodega?.aceptaEfectivo) === true)
}

/** Contra entrega: todos los paquetes por Envío Normal y la config del servidor la habilita. */
export function contraEntregaDisponible(metodosEnvio: string[], habilitada: boolean): boolean {
  return habilitada && metodosEnvio.length > 0 && metodosEnvio.every((m) => m.startsWith('ENVIO_NORMAL'))
}
