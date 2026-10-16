/**
 * S3-22: los 7 errores de ONVO en lenguaje claro (lámina admin-onvo-errores-1440). La UI nunca muestra el
 * código. El mapeo HTTP → código lo confirma Desarrollo con la API de ONVO (bloqueado en parte).
 */
export const ERRORES_ONVO = {
  DATOS_RECHAZADOS: { titulo: 'Datos rechazados', texto: 'ONVO no aceptó los datos del negocio. Revisá el correo y el nombre y volvé a intentar.' },
  CORREO_EN_ONVO: { titulo: 'Correo ya en ONVO', texto: 'Ese correo ya tiene una cuenta en ONVO. Pedile al negocio otro correo o escribí a ONVO.' },
  ENLACE_VENCIDO: { titulo: 'Enlace vencido', texto: 'El enlace de ONVO venció. Usá «Reenviar enlace».' },
  DEMASIADAS_SOLICITUDES: { titulo: 'Demasiadas solicitudes', texto: 'ONVO recibió muchas solicitudes. Probá de nuevo en unos minutos.' },
  SIN_CONEXION: { titulo: 'Sin conexión con ONVO', texto: 'ONVO no responde ahora. No se hizo ningún cambio; probá de nuevo.' },
  SIN_PERMISO: { titulo: 'Sin permiso', texto: 'No pudimos conectarnos a ONVO con la cuenta de HotClick. Avisale a Desarrollo.' },
  NO_ENCONTRADO: { titulo: 'No encontrado en ONVO', texto: 'Ese negocio no aparece en ONVO. Revisá el estado antes de volver a registrarlo.' },
} as const

export type CodigoErrorOnvo = keyof typeof ERRORES_ONVO

/** Traduce el error del backend: primero `codigo`; si no viene, el estado HTTP (mapeo provisorio de la lámina). */
export function errorOnvo(err: unknown): { titulo: string; texto: string } {
  const r = (err as { response?: { status?: number; data?: { codigo?: string } } } | null)?.response
  const codigo = r?.data?.codigo
  if (codigo && codigo in ERRORES_ONVO) return ERRORES_ONVO[codigo as CodigoErrorOnvo]
  const s = r?.status
  if (s === 400) return ERRORES_ONVO.DATOS_RECHAZADOS
  if (s === 409) return ERRORES_ONVO.CORREO_EN_ONVO
  if (s === 429) return ERRORES_ONVO.DEMASIADAS_SOLICITUDES
  if (s === 401 || s === 403) return ERRORES_ONVO.SIN_PERMISO
  if (s === 404) return ERRORES_ONVO.NO_ENCONTRADO
  return ERRORES_ONVO.SIN_CONEXION
}
