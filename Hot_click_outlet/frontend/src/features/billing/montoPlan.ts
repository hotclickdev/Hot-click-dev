import { textoMensualidad, type MonedaPlan } from '@/config/planesPrecios'

/**
 * Monto del catalogo de planes (`precioUsd` de GET /billing/planes, nombre legado: es el monto en la moneda `moneda`
 * que fija el backend con PLANES_MONEDA, la misma que cobra ONVO). No es el cobro del embed.
 * CRC → «₡12.900/mes», USD → «US$24/mes». Sin monto o con moneda desconocida, null (no se inventa nada).
 */
export function montoPlanVisible(
  plan: { precioUsd?: unknown; moneda?: MonedaPlan } | null | undefined,
): string | null {
  return montoMoneda(plan?.precioUsd, plan?.moneda)
}

/**
 * Texto de la mensualidad de una tarjeta del catálogo: «₡12.900/mes» o «US$24/mes» con el monto y la moneda del
 * backend; sin monto, «Mensualidad en colones/dólares» o neutra (nunca colones de precioMensual, nunca «Gratis» inventado).
 */
export function textoPrecioCatalogo(plan: { precioUsd?: unknown; moneda?: MonedaPlan } | null | undefined): string {
  return montoPlanVisible(plan) ?? textoMensualidad(null, false, plan?.moneda)
}

/**
 * Monto que el backend puso en la respuesta de cobro (`montoUsd` + `moneda`).
 * Sale de la misma config que el verificador compara con el price de ONVO.
 */
export function montoCobroVisible(pago: { montoUsd?: unknown; moneda?: MonedaPlan } | null | undefined): string | null {
  return montoMoneda(pago?.montoUsd, pago?.moneda)
}

function montoMoneda(valor: unknown, moneda: MonedaPlan): string | null {
  const n = Number(valor)
  if (!Number.isFinite(n) || n <= 0) return null
  const texto = textoMensualidad(n, false, moneda)
  return texto.endsWith('/mes') ? texto : null
}

/**
 * Rótulo «Precio de lista» para Emprendedor con monto: el monto es el precio de lista del plan; el cupo gratis de cada
 * negocio lo decide el backend y esta pantalla no lo conoce, así que no se afirma que ese negocio lo pague.
 */
export function rotuloPrecioLista(plan: { nombre?: unknown; precioUsd?: unknown; moneda?: MonedaPlan } | null | undefined): string | null {
  return plan?.nombre === 'EMPRENDEDOR' && montoPlanVisible(plan) ? 'Precio de lista' : null
}
