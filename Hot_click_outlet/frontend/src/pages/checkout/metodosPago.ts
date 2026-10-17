import { ICONOS_CHECKOUT } from './iconosCheckout'
import { PAGO_EFECTIVO, PAGO_SINPE, PAGO_TARJETA } from './pagoPrincipal'

type MetodoId = typeof PAGO_SINPE | typeof PAGO_TARJETA | typeof PAGO_EFECTIVO

type Metodo = { id: MetodoId; icono: string; color: string; titulo: string; subtitulo: string }

/** SINPE Móvil y Tarjeta por separado (los dos van a la pasarela); efectivo si los negocios lo aceptan o contra entrega en Envío Normal. */
export function metodosDisponibles(conEfectivo: boolean, contraEntrega = false): Metodo[] {
  const sinpe: Metodo = { id: PAGO_SINPE, icono: ICONOS_CHECKOUT.pagoSinpe, color: 'text-hc-blue-600', titulo: 'pagoSinpe', subtitulo: 'pagoSinpeSub' }
  const tarjeta: Metodo = { id: PAGO_TARJETA, icono: ICONOS_CHECKOUT.pagoSinpe, color: 'text-hc-blue-600', titulo: 'pagoTarjeta', subtitulo: 'pagoTarjetaSub' }
  const efectivo: Metodo = contraEntrega && !conEfectivo
    ? { id: PAGO_EFECTIVO, icono: ICONOS_CHECKOUT.pagoEfectivo, color: 'text-hc-n-600', titulo: 'contraEntrega', subtitulo: 'contraEntregaSub' }
    : { id: PAGO_EFECTIVO, icono: ICONOS_CHECKOUT.pagoEfectivo, color: 'text-hc-n-600', titulo: 'efectivo', subtitulo: 'efectivoSub' }
  return conEfectivo || contraEntrega ? [sinpe, tarjeta, efectivo] : [sinpe, tarjeta]
}
