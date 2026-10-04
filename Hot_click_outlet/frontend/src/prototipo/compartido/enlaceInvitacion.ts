export function mensajeApi(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback
  const message = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' && message.trim() ? message : fallback
}

export function enlaceWhatsapp(telefono: string | null | undefined, url: string, nombreNegocio: string): string {
  const texto = `Te dejo ${nombreNegocio} en HotClick. Abrí este enlace para quedar como propietario. Vence en 7 días y se usa una sola vez: ${url}`
  const digits = (telefono ?? '').replace(/\D/g, '')
  const base = digits.length > 0 ? `https://wa.me/${digits}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(texto)}`
}

export type EstadoInvitacion = 'NINGUNA' | 'PENDIENTE' | 'USADA' | 'REVOCADA' | 'EXPIRADA'

export function etiquetaEstadoInvitacion(estado: string, expiraEn?: string | null): string {
  if (estado === 'PENDIENTE') {
    return expiraEn ? `Pendiente · vence ${formatearFecha(expiraEn)}` : 'Pendiente'
  }
  if (estado === 'USADA') return 'Ya la usaron'
  if (estado === 'REVOCADA') return 'Revocada'
  if (estado === 'EXPIRADA') return 'Vencida'
  return 'Todavía no hay enlace'
}

function formatearFecha(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return fecha.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })
}
