/** Validación de formato del PIN del certificado .p12 (política de Hacienda). La prueba real la hace el backend abriendo el archivo. */
export const MSG_PIN_VACIO = 'Ingrese el PIN del certificado.'
export const MSG_PIN_FORMATO = 'El PIN debe tener 4 dígitos (llaves anteriores) o 14 caracteres (llaves nuevas).'
export const MSG_PIN_4_DIGITOS = 'El PIN de 4 caracteres debe tener solo dígitos (0-9).'

/** Devuelve el mensaje de error o null si el formato es aceptable. */
export function validarFormatoPin(pin: string): string | null {
  if (!pin || pin.trim() === '') return MSG_PIN_VACIO
  if (pin.length !== 4 && pin.length !== 14) return MSG_PIN_FORMATO
  if (pin.length === 4 && !/^\d{4}$/.test(pin)) return MSG_PIN_4_DIGITOS
  return null
}
