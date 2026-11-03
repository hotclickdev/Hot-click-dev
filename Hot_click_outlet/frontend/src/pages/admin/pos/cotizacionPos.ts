/**
 * M4: con factura electrónica en régimen simplificado el backend suma el IVA al cobro.
 * El POS no conoce el régimen ni el IVA por producto, así que pide la cotización al backend
 * (misma cuenta que crearVenta) y cobra ese total. Sin cotización válida no deja cobrar.
 */
export interface CotizacionPos {
  subtotal: number
  descuento: number
  impuesto: number
  total: number
}

export interface TotalCobroPos {
  total: number
  impuesto: number
  /** true mientras falta la cotización (cargando o con error): no se puede confirmar. */
  pendiente: boolean
}

export function normalizarCotizacion(data: unknown): CotizacionPos | null {
  const d = (data && typeof data === 'object' && 'data' in (data as object) && (data as { data: unknown }).data
    && typeof (data as { data: unknown }).data === 'object' ? (data as { data: unknown }).data : data) as Record<string, unknown> | null
  if (!d || typeof d !== 'object') return null
  const total = Number(d.total)
  const impuesto = Number(d.impuesto ?? 0)
  if (!Number.isFinite(total) || total < 0 || !Number.isFinite(impuesto) || impuesto < 0) return null
  return { subtotal: Number(d.subtotal ?? 0), descuento: Number(d.descuento ?? 0), impuesto, total }
}

export function resolverTotalCobro(totalLocal: number, facturaElectronica: boolean, cotizacion: CotizacionPos | null): TotalCobroPos {
  if (!facturaElectronica) return { total: totalLocal, impuesto: 0, pendiente: false }
  if (!cotizacion) return { total: totalLocal, impuesto: 0, pendiente: true }
  return { total: cotizacion.total, impuesto: cotizacion.impuesto, pendiente: false }
}
