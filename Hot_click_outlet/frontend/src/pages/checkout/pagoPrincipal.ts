/**
 * Pago principal «SINPE / Tarjeta».
 * Sin pasarela de tarjeta conectada (ONVO marketplace pendiente) usa el flujo SINPE que ya funciona.
 */
export function metodoPagoPrincipal(): 'SINPE' {
  return 'SINPE'
}

type ItemConBodega = { bodega?: { aceptaEfectivo?: boolean } | null; bodegaAceptaEfectivo?: boolean }

/** Efectivo solo si todos los negocios del carrito lo aceptan. */
export function efectivoDisponible(items: ItemConBodega[]): boolean {
  return items.length > 0 && items.every((i) => (i.bodegaAceptaEfectivo ?? i.bodega?.aceptaEfectivo) === true)
}
