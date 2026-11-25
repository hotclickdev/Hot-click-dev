export type CanalBandeja = 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER'
export type VistaBandeja = 'TODAS' | 'SIN_ASIGNAR' | 'MIAS'
export type EstadoBandeja = 'ABIERTA' | 'CERRADA'
export type ModoBandeja = 'BOT' | 'PERSONA'

export type ConversacionBandeja = {
  id: string
  canal: CanalBandeja
  /** Enmascarado por el servidor: solo los últimos 4 caracteres. */
  contacto: string
  modo: ModoBandeja
  estado: EstadoBandeja
  asignadoAId: number | null
  asignadaAMi: boolean
  ultimoMensaje: string | null
  ultimoMensajeEn: string | null
  ventanaAbierta: boolean
  ventanaVenceEn: string | null
  /** Nota 1 a 5 de la encuesta de satisfacción (AG-38); null si no la respondió. */
  notaEncuesta?: number | null
}

export type PaginaBandeja = {
  items: ConversacionBandeja[]
  pagina: number
  tamano: number
  total: number
  hayMas: boolean
}

export type MensajeBandeja = {
  id: number
  /** user = la persona que escribe, assistant = el bot, persona = alguien del equipo. */
  rol: 'user' | 'assistant' | 'persona' | 'system' | string
  texto: string
  fecha: string
}

export type DetalleBandeja = {
  conversacion: ConversacionBandeja
  mensajes: MensajeBandeja[]
}

export type ResumenBandeja = { asignadasAMi: number; sinAsignar: number }

export type MiembroBandeja = { id: number; nombre: string }

/** Respuesta de GET /bandeja/{id}/resumen (AG-17). disponible=false si la IA no pudo generarlo. */
export type ResumenConversacion = { disponible: boolean; resumen: string; sugerencia: string }

/** Estado del panel "Resumen" (solo presentación). */
export type EstadoResumen =
  | { tipo: 'inactivo' }
  | { tipo: 'cargando' }
  | { tipo: 'noDisponible' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; resumen: string; sugerencia: string }

export type FiltrosBandeja = {
  vista: VistaBandeja
  canal: CanalBandeja | ''
  estado: EstadoBandeja
  pagina: number
  /** Solo chats cuya encuesta quedó con nota baja (1 o 2). */
  notaBaja: boolean
}
