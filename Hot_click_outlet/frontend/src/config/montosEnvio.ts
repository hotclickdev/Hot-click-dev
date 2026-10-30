import api from '@/services/api'
import { SHIPPING_COSTS } from '@/pages/checkout/checkoutHelpers'
import { COSTO_ENVIO, ENVIO } from '@/pages/checkout/paquetesCompra'

/** Montos que configura el ADMIN (A-2). Solo para mostrar: el servidor siempre calcula el cobro. */
export type MontosEnvio = { montoGamCrc: number; montoFueraGamCrc: number; montoRapidoCrc: number }

let carga: Promise<void> | null = null

export function aplicarMontosEnvio(m: MontosEnvio): void {
  SHIPPING_COSTS.ENVIO_NORMAL_GAM = m.montoGamCrc
  SHIPPING_COSTS.ENVIO_NORMAL_FUERA_GAM = m.montoFueraGamCrc
  SHIPPING_COSTS.ENVIO_RAPIDO = m.montoRapidoCrc
  COSTO_ENVIO[ENVIO.NORMAL_GAM] = m.montoGamCrc
  COSTO_ENVIO[ENVIO.NORMAL_FUERA_GAM] = m.montoFueraGamCrc
  COSTO_ENVIO[ENVIO.RAPIDO] = m.montoRapidoCrc
}

function esMonto(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 50_000
}

/** Lee `/public/envio/montos` una vez; si falla quedan los defaults (₡4.000 / ₡5.500 / ₡5.000). */
export function cargarMontosEnvio(): Promise<void> {
  carga ??= api.get('/public/envio/montos')
    .then(({ data }) => {
      const m = (data as { data?: Partial<MontosEnvio> })?.data
      if (m && esMonto(m.montoGamCrc) && esMonto(m.montoFueraGamCrc) && esMonto(m.montoRapidoCrc)) {
        aplicarMontosEnvio(m as MontosEnvio)
      }
    })
    .catch(() => { carga = null })
  return carga
}
