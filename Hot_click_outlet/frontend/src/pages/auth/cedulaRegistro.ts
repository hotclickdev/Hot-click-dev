/** Cédula CR para el registro: física (9), jurídica (10, empieza en 3) o DIMEX (11 o 12). Igual que CedulaRegistro.java. */
export const MSG_CEDULA_INVALIDA = 'Ingresá una cédula válida (física, jurídica o DIMEX)'

/** Devuelve la cédula sin guiones ni espacios, o null si no es válida. */
export function normalizarCedulaRegistro(valor: string): string | null {
  const n = valor.replace(/[\s-]/g, '')
  return /^(\d{9}|3\d{9}|\d{11,12})$/.test(n) ? n : null
}
