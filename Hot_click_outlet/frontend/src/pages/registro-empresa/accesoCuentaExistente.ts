/** Texto exacto que el backend devuelve cuando el correo ya tiene cuenta (RegistroDuplicadoException). */
export const MENSAJE_CORREO_REGISTRADO = 'Ese correo ya está registrado.'

export function muestraAccesoCuentaExistente(error: string | null | undefined): boolean {
  return !!error && error.includes(MENSAJE_CORREO_REGISTRADO)
}
