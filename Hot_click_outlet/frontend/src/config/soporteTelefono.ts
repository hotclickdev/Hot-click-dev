/**
 * Teléfono/WhatsApp de soporte de HotClick. Nunca hardcodeado: llega en build
 * desde VITE_SOPORTE_TELEFONO (mismo valor que HOTCLICK_SOPORTE_TELEFONO del backend).
 * Vacío ⇒ la UI oculta el teléfono, los enlaces de WhatsApp y el campo del JSON-LD.
 */
export function digitosWa(raw: string | undefined | null): string {
  const d = (raw ?? '').replace(/\D/g, '')
  if (!d) return ''
  return d.length === 8 ? `506${d}` : d
}

export function textoTelefono(raw: string | undefined | null): string {
  return (raw ?? '').trim()
}

export const SOPORTE_TELEFONO = textoTelefono(import.meta.env.VITE_SOPORTE_TELEFONO)
export const SOPORTE_WA = digitosWa(import.meta.env.VITE_SOPORTE_TELEFONO)

/** URL de wa.me con mensaje opcional; null si no hay teléfono configurado. */
export function urlWa(digitos: string, mensaje?: string): string | null {
  if (!digitos) return null
  return `https://wa.me/${digitos}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`
}
