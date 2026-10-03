import type { EmpresaTiendaPublica, RetiroTienda } from '@/types/tienda'

const MESES_CORTOS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.']

/** Iniciales del logo cuando el negocio no subió uno: primeras letras de las dos primeras palabras ("Casa Luna 506" da "CL"). */
export function inicialesNegocio(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter((p) => /^\p{L}/u.test(p))
  if (palabras.length === 0) return nombre.trim().slice(0, 2).toUpperCase() || '?'
  return palabras.slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

/** "2026-09-14" a "sept. 2026" (el formato de Figma); devuelve null si la fecha no es válida. */
export function mesAnioCorto(iso?: string | null): string | null {
  if (!iso) return null
  const fecha = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(fecha.getTime())) return null
  return `${MESES_CORTOS[fecha.getMonth()]} ${fecha.getFullYear()}`
}

/** "09:00:00" a "9:00". */
export function horaCorta(hora?: string | null): string {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  return `${Number(h)}:${m ?? '00'}`
}

/** Dirección completa del punto de retiro, sin partes vacías. */
export function direccionRetiro(retiro: RetiroTienda): string {
  return [retiro.direccion, retiro.canton, retiro.provincia].filter(Boolean).join(', ')
}

/** Texto de horario del retiro ("9:00 a 18:00"), o cadena vacía si no hay horario completo. */
export function horarioRetiro(retiro: RetiroTienda): string {
  if (!retiro.horarioApertura || !retiro.horarioCierre) return ''
  return `${horaCorta(retiro.horarioApertura)} a ${horaCorta(retiro.horarioCierre)}`
}

/** Enlace de Instagram a partir de "@usuario" o "usuario". */
export function urlInstagram(usuario: string): string {
  return `https://instagram.com/${usuario.replace(/^@/, '')}`
}

/**
 * Contacto directo del vendedor (WhatsApp, Instagram) que puede ver el visitante. Regla de negocio:
 * solo planes PYME y NEGOCIO_PLUS (`contactoDirecto` lo calcula el backend). En EMPRENDEDOR la venta
 * tiene que quedar en HotClick, así que no hay botones aunque llegue un dato.
 */
export function contactoVisible(empresa?: Pick<EmpresaTiendaPublica, 'contactoDirecto' | 'whatsapp' | 'instagram'> | null): {
  whatsapp: string
  instagram: string
} {
  if (empresa?.contactoDirecto !== true) return { whatsapp: '', instagram: '' }
  return {
    whatsapp: (empresa.whatsapp ?? '').replace(/\D/g, ''),
    instagram: (empresa.instagram ?? '').trim(),
  }
}
