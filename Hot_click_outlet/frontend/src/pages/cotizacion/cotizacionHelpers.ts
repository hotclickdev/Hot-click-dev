import { formatMonto } from '@/services/cotizacionService'
import { formatMiles } from '@/utils/format'

export type ClienteCotizacion = {
  razonSocial?: string
  nombreComercial?: string
  cedulaJuridica?: string
  correo?: string
  telefono?: string
  direccion?: string
  contactoPrincipal?: string
}

export type ItemCotizacion = {
  imagenUrl?: string
  nombre?: string
  codigo?: string
  descripcion?: string
  cantidad?: number
  unidadMedida?: string
  precioUnitario?: number
  descuentoPorcentaje?: number
}

export type CotizacionPublica = {
  empresa?: { nombreEmpresa?: string }
  cliente?: ClienteCotizacion
  items?: ItemCotizacion[]
  numeroCotizacion?: string
  fechaEmision?: string
  fechaVencimiento?: string
  estadoCotizacion?: string
  nombreCliente?: string
  subtotal?: number
  aplicaIva?: boolean
  porcentajeIva?: number
  montoIva?: number
  total?: number
  moneda?: string
  observaciones?: string
  terminos?: string
}

/** Etiqueta y colores de la pastilla de estado sobre el encabezado azul (Figma `55:2339`). */
export const ESTADOS_COTIZACION: Record<string, { texto: string; clase: string }> = {
  BORRADOR: { texto: 'Borrador', clase: 'bg-hc-n-100 text-hc-n-600' },
  ENVIADA: { texto: 'Enviada', clase: 'bg-hc-blue-50 text-hc-blue-600' },
  APROBADA: { texto: 'Aprobada', clase: 'bg-hc-green-50 text-hc-success' },
  RECHAZADA: { texto: 'Rechazada', clase: 'bg-[var(--hc-danger-bg)] text-[var(--hc-danger)]' },
}

/** Nombre y línea de datos del bloque "PARA": cédula, correo, teléfono, dirección y contacto, los que existan. */
export function datosDelCliente(cot: CotizacionPublica): { nombre: string; detalle: string } {
  const c = cot.cliente ?? {}
  const detalle = [
    c.cedulaJuridica ? `Cédula jurídica ${c.cedulaJuridica}` : '',
    c.correo ?? '',
    c.telefono ?? '',
    c.direccion ?? '',
    c.contactoPrincipal ? `Attn: ${c.contactoPrincipal}` : '',
  ].filter(Boolean).join(' · ')
  return { nombre: c.razonSocial ?? c.nombreComercial ?? cot.nombreCliente ?? '—', detalle }
}

/**
 * Monto con el formato de Figma (`₡198.000`): el colón usa punto de miles como el resto del sitio y el dólar
 * sigue el formato del servicio de cotizaciones (los montos en USD viajan en centavos).
 */
export function montoCotizacion(monto: number | undefined, moneda: string | undefined = 'CRC'): string {
  return moneda === 'USD' ? formatMonto(monto, moneda) : `₡${formatMiles(monto ?? 0)}`
}

/** "20 unidades × ₡11.000 · 10% desc.": cantidad, precio unitario y descuento de una línea. */
export function textoLinea(item: ItemCotizacion, moneda: string | undefined): string {
  const cantidad = item.cantidad ?? 1
  const unidad = item.unidadMedida?.trim().toLowerCase() || (cantidad === 1 ? 'unidad' : 'unidades')
  const base = `${cantidad} ${unidad} × ${montoCotizacion(item.precioUnitario, moneda)}`
  const descuento = item.descuentoPorcentaje ?? 0
  return descuento > 0 ? `${base} · ${descuento}% desc.` : base
}
