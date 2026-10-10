import type { WalletTx } from './billeteraHelpers'

export type ResumenVentas = {
  ventas: number
  bruto: number
  comisionPlataforma: number
  comisionPasarela: number
  neto: number
  /** Porcentajes reales cobrados (null si no hay ventas con desglose). */
  tasaPlataforma: number | null
  tasaPasarela: number | null
}

const redondear1 = (n: number) => Math.round(n * 10) / 10

/** Resumen calculado de los movimientos reales de venta (sin porcentajes fijos en el código). */
export function resumenVentas(txs: WalletTx[]): ResumenVentas {
  const ventas = txs.filter((t) => t.tipo === 'CREDITO_VENTA')
  const sum = (f: (t: WalletTx) => number | undefined) => ventas.reduce((s, t) => s + (f(t) ?? 0), 0)
  const bruto = sum((t) => t.totalBruto)
  const comisionPlataforma = sum((t) => t.comisionSaas)
  const comisionPasarela = sum((t) => t.comisionGw)
  return {
    ventas: ventas.length,
    bruto,
    comisionPlataforma,
    comisionPasarela,
    neto: sum((t) => t.monto),
    tasaPlataforma: bruto > 0 ? redondear1((comisionPlataforma / bruto) * 100) : null,
    tasaPasarela: bruto > 0 ? redondear1((comisionPasarela / bruto) * 100) : null,
  }
}

export function textoTasa(tasa: number | null): string {
  return tasa == null ? '—' : `- ${tasa.toLocaleString('es-CR')}%`
}