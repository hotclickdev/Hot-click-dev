import type { SeguimientoPaquete, SeguimientoPedido } from '@/services/seguimientoPedidoService'

/**
 * El comprador invitado ya tiene usuario con ese correo (checkout de invitado), así que registrarse
 * de nuevo fallaría: «crear cuenta» es ponerle contraseña con el flujo de recuperar contraseña.
 */
export const RUTA_CREAR_CUENTA = '/login?recuperar=1'

/** Mismo formato que emite el backend (64 hex): lo demás ni se consulta. */
const FORMATO_TOKEN = /^[0-9a-f]{64}$/

export function tokenConFormatoValido(token: string | undefined): token is string {
  return !!token && FORMATO_TOKEN.test(token)
}

export type TonoEstado = 'exito' | 'info' | 'aviso' | 'neutro'

/** Colores del chip de estado (Figma 44:1720 / 44:1738 / 44:1752), solo tokens. */
export const CLASES_TONO: Record<TonoEstado, string> = {
  exito: 'bg-hc-green-50 text-hc-success-text',
  info: 'bg-hc-blue-50 text-hc-blue-600',
  aviso: 'bg-hc-warning-bg text-hc-warning',
  neutro: 'bg-hc-n-100 text-hc-n-600',
}

const TONO_POR_ESTADO: Record<string, TonoEstado> = {
  ENTREGADO: 'exito',
  ENVIADO: 'info',
  LISTO_RETIRO: 'info',
  PAGADO: 'info',
  EN_PREPARACION: 'aviso',
  PENDIENTE: 'aviso',
  PENDIENTE_COMPROBANTE: 'aviso',
  PENDIENTE_APROBACION: 'aviso',
  CANCELADO: 'neutro',
}

export const ESTADOS_CONOCIDOS = Object.keys(TONO_POR_ESTADO)

export function tonoDeEstado(estado: string | null | undefined): TonoEstado {
  return (estado && TONO_POR_ESTADO[estado]) || 'neutro'
}

/** Clave i18n del estado; estados nuevos del backend caen a «En proceso» en vez de mostrar el código. */
export function claveEstado(estado: string | null | undefined): string {
  const conocido = estado && estado in TONO_POR_ESTADO ? estado : 'otro'
  return `comprador.seguimiento.estado.${conocido}`
}

export type LineaGuia = {
  icono: 'camion' | 'caja'
  clave: string
  valores: Record<string, string>
  urlRastreo: string | null
}

/** Solo enlaces https: el backend ya filtra, esto es defensa en profundidad. */
export function urlSegura(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

/** Texto de la fila inferior de cada paquete (Figma «Guía» 44:1725 / 44:1742 / 44:1756). */
export function lineaGuia(paquete: SeguimientoPaquete, idioma: string): LineaGuia {
  const guia = paquete.numeroGuia ?? ''
  const url = urlSegura(paquete.urlRastreo)
  const base = 'comprador.seguimiento.'
  if (paquete.estado === 'ENTREGADO') {
    const fecha = paquete.fechaEntrega ? formatearFecha(paquete.fechaEntrega, idioma, false) : ''
    const clave = fecha ? (guia ? 'entregadoElConGuia' : 'entregadoEl') : (guia ? 'entregadoConGuia' : 'entregado')
    return { icono: 'camion', clave: base + clave, valores: { fecha, guia }, urlRastreo: null }
  }
  if (paquete.estado === 'CANCELADO') {
    return { icono: 'caja', clave: base + 'cancelado', valores: {}, urlRastreo: null }
  }
  if (guia) {
    const clave = paquete.courier === 'ENTREGA_DIRECTA' ? 'guiaDirecta' : 'guiaCorreos'
    return { icono: 'camion', clave: base + clave, valores: { guia }, urlRastreo: url }
  }
  if (paquete.retiroEnTienda) {
    const clave = paquete.estado === 'LISTO_RETIRO' ? 'listoRetiro' : 'retiro'
    return { icono: 'caja', clave: base + clave, valores: {}, urlRastreo: null }
  }
  return { icono: 'caja', clave: base + 'sinGuia', valores: {}, urlRastreo: null }
}

export function contarEntregados(paquetes: SeguimientoPaquete[]): number {
  return paquetes.filter((p) => p.estado === 'ENTREGADO').length
}

const LOCALE_FECHA: Record<string, string> = { es: 'es-CR', en: 'en-US', pt: 'pt-BR' }

/**
 * «26 sep 2026» / «24 sep» como en el Figma. Toma solo la parte de fecha (yyyy-mm-dd) para que
 * la zona horaria del navegador no corra el día.
 */
export function formatearFecha(iso: string, idioma: string, conAnio = true): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return ''
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const locale = LOCALE_FECHA[idioma.slice(0, 2)] ?? 'es-CR'
  const mes = new Intl.DateTimeFormat(locale, { month: 'short' }).format(fecha).replace('.', '').slice(0, 3)
  return conAnio ? `${fecha.getDate()} ${mes} ${fecha.getFullYear()}` : `${fecha.getDate()} ${mes}`
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

/** Desenvuelve `ResponseDTO` y valida lo mínimo; cualquier forma inesperada se trata como «no encontrado». */
export function seguimientoDesdeRespuesta(data: unknown): SeguimientoPedido | null {
  const cuerpo = esObjeto(data) && 'data' in data ? data.data : data
  if (!esObjeto(cuerpo) || typeof cuerpo.numeroPedido !== 'string' || !Array.isArray(cuerpo.paquetes)) return null
  return {
    ...(cuerpo as unknown as SeguimientoPedido),
    paquetes: cuerpo.paquetes.filter(esObjeto) as SeguimientoPaquete[],
  }
}
