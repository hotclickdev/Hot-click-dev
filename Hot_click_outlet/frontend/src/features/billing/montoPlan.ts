import { textoMensualidad } from '@/config/planesPrecios'

/**
 * Monto del catalogo de planes (`precioUsd` de GET /billing/planes). No es el cobro del embed.
 * USD configurado; sin monto, null. No usa colones: ONVO cobra el precio en dolares.
 */
export function montoPlanVisible(
  plan: { precioUsd?: unknown } | null | undefined,
): string | null {
  return montoUsd(plan?.precioUsd)
}

/**
 * Monto que el backend puso en la respuesta de cobro (`montoUsd`).
 * Sale de la misma config que el verificador compara con el price de ONVO.
 */
export function montoCobroVisible(pago: { montoUsd?: unknown } | null | undefined): string | null {
  return montoUsd(pago?.montoUsd)
}

function montoUsd(valor: unknown): string | null {
  const n = Number(valor)
  if (!Number.isFinite(n) || n <= 0) return null
  return textoMensualidad(n)
}
