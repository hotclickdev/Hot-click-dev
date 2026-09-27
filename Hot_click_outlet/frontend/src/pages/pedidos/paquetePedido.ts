import { WHATSAPP } from '@/pages/contacto/contactoHelpers'
import { estadoDePedido } from './pedidoHelpers'
import type { PedidoCliente } from './pedidoHelpers'

export type TonoEstado = 'azul' | 'ambar' | 'verde' | 'rojo'

export type EstadoPaquete = 'pendiente' | 'enPreparacion' | 'listoRetiro' | 'enviado' | 'entregado' | 'cancelado'

const ESTADO_PAQUETE: Record<string, EstadoPaquete> = {
  PENDIENTE: 'pendiente',
  PAGADO: 'enPreparacion',
  EN_PREPARACION: 'enPreparacion',
  LISTO_RETIRO: 'listoRetiro',
  ENVIADO: 'enviado',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado',
}

export const TONO_ESTADO_PAQUETE: Record<EstadoPaquete, TonoEstado> = {
  pendiente: 'ambar',
  enPreparacion: 'ambar',
  listoRetiro: 'azul',
  enviado: 'azul',
  entregado: 'verde',
  cancelado: 'rojo',
}

const URL_RASTREO_CORREOS = 'https://rastreo.correos.go.cr/?codigo='
const DOMINIO_CORREOS = 'correos.go.cr'

export function estadoPaquete(paquete: PedidoCliente): EstadoPaquete {
  return ESTADO_PAQUETE[estadoDePedido(paquete)] ?? 'enPreparacion'
}

/** Garantía y opinión se habilitan cuando el paquete se entrega (Figma `37:1496`). */
export function accionesHabilitadas(paquete: PedidoCliente): boolean {
  return estadoPaquete(paquete) === 'entregado'
}

/** Misma regla que el correo de guía: sin URL o con URL de Correos → Correos de Costa Rica. */
export function esGuiaDeCorreos(paquete: PedidoCliente): boolean {
  return !paquete.urlTracking || paquete.urlTracking.includes(DOMINIO_CORREOS)
}

export function urlSeguimiento(paquete: PedidoCliente): string | null {
  if (!paquete.numeroGuia) return null
  return paquete.urlTracking ?? `${URL_RASTREO_CORREOS}${encodeURIComponent(paquete.numeroGuia)}`
}

export function urlWhatsApp(mensaje: string): string {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`
}

export function nombreTienda(paquete: PedidoCliente): string {
  return paquete.nombreNegocio?.trim() || 'HotClick'
}
