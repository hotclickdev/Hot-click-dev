/** Saldo por reintegrar (solo admin): lectura segura de la respuesta y textos. Los montos van en la moneda del pago. */

import { formatPrice } from '@/utils/format'

export type PagoReintegro = {
  pagoId: number
  pedido: string
  monto: number
  moneda: string
  estado: 'NO_REINTEGRADO' | 'REINTEGRADO'
  reintegradoPor: string | null
  reintegradoEn: string | null
  nota: string | null
}

export type NegocioReintegro = {
  empresaId: number
  negocio: string
  moneda: string
  montoPendiente: number
  montoReintegrado: number
  cantidadPendiente: number
  pagos: PagoReintegro[]
}

function num(v: unknown): number { return typeof v === 'number' && Number.isFinite(v) ? v : 0 }
function str(v: unknown): string { return typeof v === 'string' ? v : '' }
function strONull(v: unknown): string | null { return typeof v === 'string' && v ? v : null }

export function leerReintegros(data: unknown): NegocioReintegro[] {
  if (!Array.isArray(data)) return []
  const salida: NegocioReintegro[] = []
  for (const fila of data) {
    if (!fila || typeof fila !== 'object') continue
    const f = fila as Record<string, unknown>
    const empresaId = num(f.empresaId)
    if (empresaId <= 0) continue
    const pagos: PagoReintegro[] = (Array.isArray(f.pagos) ? f.pagos : []).flatMap((p) => {
      if (!p || typeof p !== 'object') return []
      const x = p as Record<string, unknown>
      const pagoId = num(x.pagoId)
      if (pagoId <= 0) return []
      return [{
        pagoId, pedido: str(x.pedido), monto: num(x.monto), moneda: str(x.moneda) || 'CRC',
        estado: x.estado === 'REINTEGRADO' ? 'REINTEGRADO' as const : 'NO_REINTEGRADO' as const,
        reintegradoPor: strONull(x.reintegradoPor), reintegradoEn: strONull(x.reintegradoEn), nota: strONull(x.nota),
      }]
    })
    salida.push({
      empresaId, negocio: str(f.negocio) || 'Negocio', moneda: str(f.moneda) || 'CRC',
      montoPendiente: num(f.montoPendiente), montoReintegrado: num(f.montoReintegrado),
      cantidadPendiente: num(f.cantidadPendiente), pagos,
    })
  }
  return salida
}

/** ₡ con punto de miles (utils/format) para colones; otra moneda lleva su código y no se convierte. */
export function formatoMonto(monto: number, moneda: string): string {
  if (moneda === 'CRC') return formatPrice(monto)
  return `${monto} ${moneda}`
}

export function textoEstado(estado: PagoReintegro['estado']): string {
  return estado === 'REINTEGRADO' ? 'Reintegrado' : 'No reintegrado'
}

/** Totales pendientes por moneda (no se mezclan monedas). */
export function totalesPendientes(negocios: NegocioReintegro[]): Record<string, number> {
  const t: Record<string, number> = {}
  for (const n of negocios) if (n.montoPendiente > 0) t[n.moneda] = (t[n.moneda] ?? 0) + n.montoPendiente
  return t
}
