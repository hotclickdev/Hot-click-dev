import { formatPrice } from '@/utils/format'

/** Estados que manejan `ejecutarValidarGiftCard` / `ejecutarValidarCupon`. */
export type EstadoCodigo = 'idle' | 'loading' | 'valid' | 'invalid'

/**
 * Borde del campo de código según el Figma (55:2220 válido · 55:2284 inválido):
 * éxito en verde, error en rojo, y el borde neutro del sistema en reposo.
 */
export function claseBordeCodigo(estado: string): string {
  if (estado === 'valid') return 'border-hc-success'
  if (estado === 'invalid') return 'border-hc-red-500'
  return 'border-hc-border'
}

/** Saldo de la tarjeta de regalo que queda después de aplicarla al pedido. */
export function saldoRestanteGiftCard(saldo: number, aplicado: number): number {
  return Math.max(0, saldo - aplicado)
}

/** Monto restado del total, con el signo menos del Figma: "− ₡50.000". */
export function formatoRebaja(monto: number): string {
  return `− ${formatPrice(monto)}`
}
