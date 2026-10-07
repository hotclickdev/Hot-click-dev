/** Arma un wa.me. No llama a una API de pago. */
export function enlaceWhatsapp(telefono: string, mensaje: string): string | null {
  const digitos = telefono.replace(/\D/g, '')
  if (digitos.length < 8) return null
  const local = digitos.startsWith('506') ? digitos : `506${digitos}`
  if (local.length < 11) return null
  return `https://wa.me/${local}?text=${encodeURIComponent(mensaje)}`
}
