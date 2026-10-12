import { useQuery } from '@tanstack/react-query'
import { paymentService } from '@/services/paymentService'

/**
 * Pago principal «SINPE / Tarjeta»: siempre la pasarela Tilopay (cobra SINPE Móvil y tarjeta).
 * El SINPE manual con comprobante ya no se ofrece en el checkout.
 */
export function metodoPagoPrincipal(): 'TILOPAY' {
  return 'TILOPAY'
}

/** Tarjeta y SINPE Móvil: los dos van a la pasarela Tilopay. */
export function esMetodoTilopay(metodo: string): boolean {
  return metodo === 'TILOPAY' || metodo === 'TILOPAY_SINPE'
}

/** `false` solo si el backend confirma que Tilopay no tiene credenciales; mientras carga, `null`. */
export function usePagosTarjetaDisponibles(): boolean | null {
  const { data } = useQuery({
    queryKey: ['pagos-disponibilidad'],
    queryFn: async () => (await paymentService.disponibilidad()).data,
    staleTime: 60_000,
    retry: 1,
  })
  return data ? data.tilopay !== false : null
}

type ItemConBodega = { bodega?: { aceptaEfectivo?: boolean } | null; bodegaAceptaEfectivo?: boolean }

/** Efectivo solo si todos los negocios del carrito lo aceptan. */
export function efectivoDisponible(items: ItemConBodega[]): boolean {
  return items.length > 0 && items.every((i) => (i.bodegaAceptaEfectivo ?? i.bodega?.aceptaEfectivo) === true)
}
