import type { EmbudoBot, ConfigBot, DiaHorario, PedidoConfigBot } from './botTypes'

export const NOMBRE_MAX = 60
export const MENSAJE_MAX = 500
export const MENSAJE_SIMULADOR_MAX = 500
export const TITULO_MAX = 200
export const CONTENIDO_MAX = 4000
export const TAMANO_LEADS = 20
const PATRON_NOMBRE = /^[\p{L}\p{N} .,'&-]+$/u
const PATRON_PIN = /^\d{4,6}$/

type ErrorConRespuesta = { response?: { status?: number; data?: { message?: unknown } } }

/** Mensaje del servidor cuando es de negocio (400/403/404/409/429); si no, el genérico. */
export function mensajeDeError(e: unknown, generico: string): string {
  const r = (e as ErrorConRespuesta | null)?.response
  const msg = r?.data?.message
  if (r && typeof msg === 'string' && msg.trim() && [400, 403, 404, 409, 429].includes(r.status ?? 0)) return msg
  return generico
}

export function pinValido(pin: string): boolean {
  return PATRON_PIN.test(pin)
}

/** Clave i18n del problema de la configuración, o null si se puede guardar. */
export function errorDeConfig(c: PedidoConfigBot): string | null {
  const nombre = c.nombreBot.trim()
  if (nombre.length === 0 || nombre.length > NOMBRE_MAX || !PATRON_NOMBRE.test(nombre)) return 'bot.config.errorNombre'
  if ((c.mensajeFueraHorario ?? '').length > MENSAJE_MAX) return 'bot.config.errorMensaje'
  if (c.horarioActivo) {
    for (const d of c.horario) {
      if (d.abierto && !(d.desde < d.hasta)) return 'bot.config.errorHorario'
    }
  }
  return null
}

export function aPedido(c: ConfigBot): PedidoConfigBot {
  return {
    nombreBot: c.nombreBot,
    trato: c.trato,
    emojis: c.emojis,
    activo: c.activo,
    horarioActivo: c.horarioActivo,
    horario: c.horario,
    mensajeFueraHorario: c.mensajeFueraHorario,
  }
}

export function cambiarDia(horario: DiaHorario[], dia: DiaHorario['dia'], parcial: Partial<DiaHorario>): DiaHorario[] {
  return horario.map((d) => (d.dia === dia ? { ...d, ...parcial } : d))
}

/** Fecha corta en hora de Costa Rica ("24 nov, 14:05"); vacío si no es válida. */
export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return ''
  const f = new Date(iso)
  if (Number.isNaN(f.getTime())) return ''
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: 'America/Costa_Rica', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(f)
}

export const PESTANAS = ['config', 'conocimiento', 'canales', 'equipo', 'simulador', 'leads', 'metricas'] as const
export type Pestana = (typeof PESTANAS)[number]

/** Índice de la pestaña a la que mueven las flechas, Inicio y Fin (patrón de pestañas WAI-ARIA); null si la tecla no aplica. */
export function indiceSiguiente(actual: number, tecla: string, total: number): number | null {
  if (tecla === 'ArrowRight') return (actual + 1) % total
  if (tecla === 'ArrowLeft') return (actual - 1 + total) % total
  if (tecla === 'Home') return 0
  if (tecla === 'End') return total - 1
  return null
}

/** Porcentaje (0-100) del cupo usado; null si es ilimitado o no hay cupo. */
export function porcentajeCupo(conversaciones: number, cupo: number | null): number | null {
  if (cupo == null || cupo < 0) return null
  if (cupo === 0) return 100
  return Math.min(100, Math.round((conversaciones * 100) / cupo))
}

export function cupoAgotado(conversaciones: number, cupo: number | null): boolean {
  return cupo != null && cupo >= 0 && conversaciones >= cupo
}

const DIA_MS = 86_400_000

/** Fecha local en formato AAAA-MM-DD (lo que espera el servidor). */
export function aIsoLocal(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

/** Últimos 30 días hasta hoy (inclusive). */
export function rangoPorDefecto(hoy: Date = new Date()): { desde: string; hasta: string } {
  return { desde: aIsoLocal(new Date(hoy.getTime() - 29 * DIA_MS)), hasta: aIsoLocal(hoy) }
}

/** Mensaje i18n del problema del rango, o null si se puede consultar (máximo 366 días, igual que el servidor). */
export function errorDeRango(desde: string, hasta: string): string | null {
  if (!desde || !hasta) return 'bot.metricas.rangoIncompleto'
  const d = Date.parse(`${desde}T00:00:00Z`)
  const h = Date.parse(`${hasta}T00:00:00Z`)
  if (Number.isNaN(d) || Number.isNaN(h) || d > h) return 'bot.metricas.rangoInvalido'
  if ((h - d) / DIA_MS > 366) return 'bot.metricas.rangoLargo'
  return null
}

/** Ancho (0-100) de una barra del embudo respecto al paso más grande; las barras con valor nunca bajan de 2 %. */
export function anchoBarra(valor: number, maximo: number): number {
  if (maximo <= 0 || valor <= 0) return 0
  return Math.max(2, Math.min(100, Math.round((valor / maximo) * 100)))
}

/** Los pasos del embudo en orden, con su clave i18n. */
export function pasosEmbudo(e: EmbudoBot): Array<{ clave: string; valor: number }> {
  return [
    { clave: 'conversaciones', valor: e.conversaciones },
    { clave: 'enlacesCreados', valor: e.enlacesCreados },
    { clave: 'enlacesAbiertos', valor: e.enlacesAbiertos },
    { clave: 'enlacesPagados', valor: e.enlacesPagados },
  ]
}
