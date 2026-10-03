import { envioGratis } from '../../../src/main/resources/config/tiempos-envio.json'

/**
 * Umbral de envío gratis por paquete (una tienda), en colones. Sale de la misma config compartida que
 * los tiempos de envío (`src/main/resources/config/tiempos-envio.json`, clave `envioGratis.desdeColones`).
 *
 * HOY es `null`: el checkout cobra tarifa fija (`OrderPricingService.calcularCostoEnvio`,
 * `checkoutHelpers.SHIPPING_COSTS`), así que no se promete envío gratis en ningún lado.
 * Un valor nulo, no numérico o ≤ 0 se trata como "sin envío gratis".
 */
export function normalizarUmbralEnvioGratis(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : null
}

export const UMBRAL_ENVIO_GRATIS: number | null = normalizarUmbralEnvioGratis((envioGratis as { desdeColones: unknown }).desdeColones)

/** Progreso de un subtotal hacia el umbral: cuánto falta y el porcentaje (0–100). */
export function progresoEnvioGratis(subtotal: number, umbral: number): { falta: number; porcentaje: number; listo: boolean } {
  const falta = Math.max(0, umbral - Math.max(0, subtotal))
  const porcentaje = Math.min(100, Math.max(0, Math.round((subtotal / umbral) * 100)))
  return { falta, porcentaje, listo: falta === 0 }
}
