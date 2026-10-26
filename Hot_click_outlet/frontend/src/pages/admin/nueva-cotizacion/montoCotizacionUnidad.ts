/**
 * Unidad de los montos de cotización (C2): el backend guarda enteros (INTEGER en V84).
 * CRC viaja en colones enteros y USD en centavos, igual que lo muestra formatMonto.
 */
export function aValorInput(monto: number | undefined, moneda: string = 'CRC'): number {
  const m = monto ?? 0
  return moneda === 'USD' ? m / 100 : m
}

export function desdeValorInput(valor: string | number, moneda: string = 'CRC'): number {
  const v = Number(valor)
  if (!Number.isFinite(v) || v < 0) return 0
  return moneda === 'USD' ? Math.round(v * 100) : Math.round(v)
}

/** El precio de catálogo está en colones: en USD no se autollena (no hay tipo de cambio en la cotización). */
export function precioAutollenado(precioVentaCrc: number | undefined, moneda: string = 'CRC'): number {
  return moneda === 'USD' ? 0 : (precioVentaCrc ?? 0)
}
