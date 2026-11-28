import type { EstadoFacturaNegocio } from '@/services/facturaNegocioService'

/** Tope del backend por archivo (1 MB). */
export const MAX_BYTES_XML = 1024 * 1024

const ETIQUETAS: Record<EstadoFacturaNegocio, string> = {
  PENDIENTE: 'Pendiente',
  RECIBIDA: 'Recibida, pendiente de revisión de HotClick',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  VENCIDA: 'Vencida',
  NO_APLICA: 'No aplica',
}

export function etiquetaEstado(estado: string): string {
  return ETIQUETAS[estado as EstadoFacturaNegocio] ?? estado
}

export type TonoEstado = 'neutro' | 'ok' | 'alerta' | 'azul'

export function tonoEstado(estado: string): TonoEstado {
  if (estado === 'ACEPTADA') return 'ok'
  if (estado === 'RECHAZADA' || estado === 'VENCIDA') return 'alerta'
  if (estado === 'PENDIENTE' || estado === 'RECIBIDA') return 'azul'
  return 'neutro'
}

/** Se puede subir (o volver a subir) el XML en estos estados. */
export function sePuedeSubir(estado: string): boolean {
  return estado === 'PENDIENTE' || estado === 'RECHAZADA' || estado === 'VENCIDA'
}

/** Aviso del panel: "Enviá tu factura de la quincena (te quedan N días)". */
export function textoAvisoPanel(dias: number): string {
  if (dias <= 0) return 'Enviá tu factura de la quincena (el plazo vence hoy o ya venció)'
  const resto = dias === 1 ? 'queda 1 día' : 'quedan ' + dias + ' días'
  return `Enviá tu factura de la quincena (te ${resto})`
}

/** Revisa el archivo antes de subirlo: XML y como máximo 1 MB. */
export function errorArchivoXml(archivo: { name: string; size: number } | null | undefined): string | null {
  if (!archivo) return 'Elegí el XML de la factura.'
  if (!/\.xml$/i.test(archivo.name)) return 'El archivo tiene que ser un .xml.'
  if (archivo.size <= 0) return 'El archivo está vacío.'
  if (archivo.size > MAX_BYTES_XML) return 'El archivo pesa más de 1 MB.'
  return null
}

/** "1 al 15 de marzo de 2026" a partir de dos fechas ISO (aaaa-mm-dd). */
export function textoPeriodo(desde: string, hasta: string): string {
  const d = new Date(`${desde}T12:00:00`)
  const h = new Date(`${hasta}T12:00:00`)
  if (Number.isNaN(d.getTime()) || Number.isNaN(h.getTime())) return `${desde} al ${hasta}`
  const mes = new Intl.DateTimeFormat('es-CR', { month: 'long', year: 'numeric' }).format(h)
  return `${d.getDate()} al ${h.getDate()} de ${mes}`
}
