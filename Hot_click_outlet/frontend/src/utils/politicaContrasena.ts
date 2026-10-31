/** Misma política que AuthSupport.esContrasenaValida en el backend. */
export const MENSAJE_POLITICA_CONTRASENA = 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número'

export function cumplePoliticaContrasena(pwd: string | null | undefined): boolean {
  if (!pwd || pwd.length < 8) return false
  return /\p{Lu}/u.test(pwd) && /\p{Nd}/u.test(pwd)
}
