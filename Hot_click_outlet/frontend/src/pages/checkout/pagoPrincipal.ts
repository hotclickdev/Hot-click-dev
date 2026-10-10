/**
 * Pago principal «SINPE / Tarjeta».
 * Mientras la API de Tilopay no esté lista, usa el flujo SINPE que ya funciona (comprobante).
 * Con VITE_TILOPAY_ACTIVO=true pasa a la pasarela Tilopay, que cobra SINPE y tarjeta.
 */
export function tilopayActivo(): boolean {
  return import.meta.env.VITE_TILOPAY_ACTIVO === 'true'
}

export function metodoPagoPrincipal(): 'SINPE' | 'TILOPAY' {
  return tilopayActivo() ? 'TILOPAY' : 'SINPE'
}

type ItemConBodega = { bodega?: { aceptaEfectivo?: boolean } | null; bodegaAceptaEfectivo?: boolean }

/** Efectivo solo si todos los negocios del carrito lo aceptan. */
export function efectivoDisponible(items: ItemConBodega[]): boolean {
  return items.length > 0 && items.every((i) => (i.bodegaAceptaEfectivo ?? i.bodega?.aceptaEfectivo) === true)
}
