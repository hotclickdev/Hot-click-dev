/** Redondeo comercial HotClick: al múltiplo de ₡50 más cercano. */
export function redondearA50(monto: number): number {
  if (!Number.isFinite(monto) || monto <= 0) return 0
  return Math.round(monto / 50) * 50
}

/**
 * Precio de venta sugerido para que, tras comisión % + fijo de pasarela, quede `neto`.
 * Ejemplo: neto 10_000, 4%, fijo 0 → ~10_400 redondeado a 50.
 */
export function precioSugerido(neto: number, pct: number, fijo: number): number {
  if (!Number.isFinite(neto) || neto <= 0) return 0
  const porcentaje = Number.isFinite(pct) ? Math.max(0, pct) : 0
  const fijoSeguro = Number.isFinite(fijo) ? Math.max(0, fijo) : 0
  const factor = 1 - porcentaje / 100
  if (factor <= 0) return redondearA50(neto + fijoSeguro)
  return redondearA50((neto + fijoSeguro) / factor)
}

/** Ahorro estimado al pagar SINPE en lugar de pasarela (pct del total). */
export function descuentoSinpe(total: number, pct: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  if (!Number.isFinite(pct) || pct <= 0) return 0
  return Math.round(total * pct / 100)
}

export const COMISION_GATEWAY_PCT_DEFAULT = 4.8
export const COMISION_GATEWAY_FIJO_DEFAULT = 200

export type ConfigComision = {
  pctComisionTarjeta: number
  montoFijoComisionCrc: number
  pctDescuentoSinpe: number
}

/** Normaliza la respuesta del API o usa defaults Tilopay. */
export function parseConfigComision(raw: unknown): ConfigComision {
  const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const pct = Number(o.pctComisionTarjeta ?? o.porcentaje)
  const fijo = Number(o.montoFijoComisionCrc ?? o.fijo)
  const sinpe = Number(o.pctDescuentoSinpe)
  return {
    pctComisionTarjeta: Number.isFinite(pct) && pct >= 0 ? pct : COMISION_GATEWAY_PCT_DEFAULT,
    montoFijoComisionCrc: Number.isFinite(fijo) && fijo >= 0 ? Math.round(fijo) : COMISION_GATEWAY_FIJO_DEFAULT,
    pctDescuentoSinpe: Number.isFinite(sinpe) && sinpe >= 0 ? sinpe : 0,
  }
}
