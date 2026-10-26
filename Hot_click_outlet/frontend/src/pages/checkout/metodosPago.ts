import { ICONOS_CHECKOUT } from './iconosCheckout'
import { PAGO_SINPE, PAGO_TARJETA } from './pagoPrincipal'

type MetodoId = string

type Metodo = { id: MetodoId; icono: string; color: string; titulo: string; subtitulo: string }

/**
 * Checkout web: SINPE Móvil y Tarjeta (ONVO). Decisión 24-oct-2026: efectivo y contra entrega quedan
 * solo en el POS, así que el checkout web no los ofrece.
 * Sin ONVO ni SINPE manual con número destino configurado (`sinpeHabilitado` false), SINPE no se ofrece (fail-closed).
 */
export function metodosDisponibles(sinpeHabilitado = true): Metodo[] {
  const sinpe: Metodo = { id: PAGO_SINPE, icono: ICONOS_CHECKOUT.pagoSinpe, color: 'text-hc-blue-600', titulo: 'pagoSinpe', subtitulo: 'pagoSinpeSub' }
  const tarjeta: Metodo = { id: PAGO_TARJETA, icono: ICONOS_CHECKOUT.pagoSinpe, color: 'text-hc-blue-600', titulo: 'pagoTarjeta', subtitulo: 'pagoTarjetaSub' }
  return sinpeHabilitado ? [sinpe, tarjeta] : [tarjeta]
}
