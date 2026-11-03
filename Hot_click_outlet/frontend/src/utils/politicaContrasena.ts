/** Misma política que AuthSupport.esContrasenaValida en el backend. */
export const MENSAJE_POLITICA_CONTRASENA = 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número'

export type FaltaContrasena = 'largo' | 'mayuscula' | 'numero'

/** Qué le falta a la contraseña (vacío si cumple). Mismo orden que el backend. */
export function faltantesContrasena(pwd: string | null | undefined): FaltaContrasena[] {
  const p = pwd ?? ''
  const faltan: FaltaContrasena[] = []
  if (p.length < 8) faltan.push('largo')
  if (!/\p{Lu}/u.test(p)) faltan.push('mayuscula')
  if (!/\p{Nd}/u.test(p)) faltan.push('numero')
  return faltan
}

/** Mensaje traducido: "Te falta una mayúscula y un número". Null si cumple. */
export function mensajeFaltaContrasena(pwd: string | null | undefined, t: (k: string, o?: Record<string, string>) => string): string | null {
  const faltan = faltantesContrasena(pwd)
  if (faltan.length === 0) return null
  const CLAVE = { largo: 'register.claveFaltaLargo', mayuscula: 'register.claveFaltaMayuscula', numero: 'register.claveFaltaNumero' } as const
  const partes = faltan.map(f => t(CLAVE[f]))
  const lista = partes.length === 1 ? partes[0]
    : `${partes.slice(0, -1).join(', ')} ${t('register.claveFaltaY')} ${partes[partes.length - 1]}`
  return t('register.claveFalta', { lista })
}

export function cumplePoliticaContrasena(pwd: string | null | undefined): boolean {
  if (!pwd || pwd.length < 8) return false
  return /\p{Lu}/u.test(pwd) && /\p{Nd}/u.test(pwd)
}
