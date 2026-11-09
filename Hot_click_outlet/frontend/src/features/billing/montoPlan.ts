import { textoMensualidad } from '@/config/planesPrecios'
import { formatPrice } from '@/utils/format'

/**
 * Monto a mostrar antes de confirmar el pago. Sale del plan que mandó el backend.
 * USD si hay `precioUsd`; si no, colones de `precioMensual`. Sin monto, null: no se inventa.
 */
export function montoPlanVisible(
  plan: { precioUsd?: unknown; precioMensual?: unknown } | null | undefined,
): string | null {
  const usd = Number(plan?.precioUsd)
  if (Number.isFinite(usd) && usd > 0) return textoMensualidad(usd)
  const crc = Number(plan?.precioMensual)
  if (Number.isFinite(crc) && crc > 0) return `${formatPrice(crc)}/mes`
  return null
}
