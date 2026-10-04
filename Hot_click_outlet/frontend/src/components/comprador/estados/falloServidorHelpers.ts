import { esRutaClaudeclick } from '@/utils/rutaPrototipo'
import { formatTelefonoCR } from '@/utils/telefono'

/** WhatsApp de soporte de HotClick (mismo número que el FAB del sitio). */
export const WHATSAPP_SOPORTE = '50686667888'
export const WHATSAPP_SOPORTE_VISIBLE = formatTelefonoCR(WHATSAPP_SOPORTE)

const HTTP_ERROR_SERVIDOR = 500
const LARGO_REFERENCIA = 8

/** Áreas de panel (admin, POS, planes de negocio): conservan su propio error boundary. */
const PREFIJOS_PANEL = ['/admin', '/pos', '/emprendedor', '/pyme', '/negocio-plus', '/prototipo']

type ErrorHttp = { response?: { status?: number; headers?: Record<string, unknown> } }

function respuestaDe(error: unknown): ErrorHttp['response'] {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined
  return (error as ErrorHttp).response
}

/** True si la API respondió 5xx (fallo nuestro, no del comprador ni de su conexión). */
export function esFalloServidor(error: unknown): boolean {
  const status = respuestaDe(error)?.status
  return typeof status === 'number' && status >= HTTP_ERROR_SERVIDOR
}

/** Referencia corta y aleatoria (hex) para que el comprador la comparta con soporte. */
export function crearReferenciaError(aleatorio: (n: number) => Uint8Array = bytesAleatorios): string {
  return Array.from(aleatorio(LARGO_REFERENCIA / 2), (b) => b.toString(16).padStart(2, '0')).join('')
}

function bytesAleatorios(n: number): Uint8Array {
  const bytes = new Uint8Array(n)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

/**
 * Referencia del error: el X-Request-Id que devuelve el backend (MdcRequestIdFilter)
 * permite cruzarla con los logs; si no vino, se genera una local.
 */
export function referenciaDelError(error: unknown, generar: () => string = crearReferenciaError): string {
  const id = respuestaDe(error)?.headers?.['x-request-id']
  return typeof id === 'string' && id.trim() ? id.trim() : generar()
}

export function enlaceWhatsappSoporte(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(mensaje)}`
}

/** True en rutas de panel; el resto (marketplace, tiendas, checkout) es del comprador. */
export function esRutaPanel(pathname: string): boolean {
  return PREFIJOS_PANEL.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || esRutaClaudeclick(pathname)
}
