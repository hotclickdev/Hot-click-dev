import type { ConversacionBandeja, EstadoResumen, FiltrosBandeja, MiembroBandeja, ResumenConversacion } from './bandejaTypes'

/** Refresco periódico (sin websockets): la lista y el hilo abierto se piden cada 10 s. */
export const INTERVALO_REFRESCO_MS = 10_000
export const MAX_TEXTO_RESPUESTA = 1000

/** Estado del panel Resumen a partir del resultado de la consulta (puro, para pruebas). */
export function estadoDeResumen(
  r: ResumenConversacion | undefined, cargando: boolean, error: string | null,
): EstadoResumen {
  if (cargando) return { tipo: 'cargando' }
  if (error) return { tipo: 'error', mensaje: error }
  if (!r) return { tipo: 'inactivo' }
  if (!r.disponible) return { tipo: 'noDisponible' }
  return { tipo: 'listo', resumen: r.resumen, sugerencia: r.sugerencia }
}

export const FILTROS_INICIALES: FiltrosBandeja = { vista: 'TODAS', canal: '', estado: 'ABIERTA', pagina: 0 }

/** Parámetros del GET /api/bandeja; el canal vacío no se manda. */
export function paramsDeFiltros(f: FiltrosBandeja, tamano: number): Record<string, string | number> {
  const p: Record<string, string | number> = {
    vista: f.vista,
    estado: f.estado,
    pagina: f.pagina,
    tamano,
  }
  if (f.canal) p.canal = f.canal
  return p
}

/** Nombre de quien atiende, o null si no hay nadie asignado. Si no está en el equipo cargado: genérico. */
export function nombreAsignado(
  c: Pick<ConversacionBandeja, 'asignadoAId' | 'asignadaAMi'>,
  equipo: MiembroBandeja[],
  etiquetas: { yo: string; otra: string },
): string | null {
  if (c.asignadoAId == null) return null
  if (c.asignadaAMi) return etiquetas.yo
  return equipo.find((m) => m.id === c.asignadoAId)?.nombre ?? etiquetas.otra
}

/** Se puede escribir solo con la conversación abierta y dentro de la ventana de 24 h del canal. */
export function puedeResponder(c: Pick<ConversacionBandeja, 'estado' | 'ventanaAbierta'>): boolean {
  return c.estado === 'ABIERTA' && c.ventanaAbierta
}

export function textoRespuestaValido(texto: string): boolean {
  const t = texto.trim()
  return t.length > 0 && t.length <= MAX_TEXTO_RESPUESTA
}

/** Hora corta de hoy ("14:05") o día y hora ("24 nov, 14:05"), en hora de Costa Rica. */
export function formatearMomento(iso: string | null, ahora: Date = new Date()): string {
  if (!iso) return ''
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ''
  const zona = 'America/Costa_Rica'
  const dia = (d: Date) => new Intl.DateTimeFormat('es-CR', { timeZone: zona, year: 'numeric', month: 'numeric', day: 'numeric' }).format(d)
  const hora = new Intl.DateTimeFormat('es-CR', { timeZone: zona, hour: '2-digit', minute: '2-digit', hour12: false }).format(fecha)
  if (dia(fecha) === dia(ahora)) return hora
  const diaMes = new Intl.DateTimeFormat('es-CR', { timeZone: zona, day: 'numeric', month: 'short' }).format(fecha)
  return `${diaMes}, ${hora}`
}

type ErrorConRespuesta = { response?: { status?: number; data?: { message?: unknown } } }

/** Mensaje del servidor cuando es de negocio (409/403/404/400); si no, el genérico. */
export function mensajeDeError(e: unknown, generico: string): string {
  const r = (e as ErrorConRespuesta | null)?.response
  const msg = r?.data?.message
  if (r && typeof msg === 'string' && msg.trim() && [400, 403, 404, 409].includes(r.status ?? 0)) return msg
  return generico
}

export function esConflicto(e: unknown): boolean {
  return (e as ErrorConRespuesta | null)?.response?.status === 409
}
