/**
 * Identificación de Costa Rica (misma regla que `CedulaCr.java`): 9 a 12 dígitos sin guiones (física, jurídica, DIMEX
 * o NITE); la física de 9 no empieza en 0 y se rechaza un solo dígito repetido (p. ej. «111111111», aceptado antes:
 * bug del 3-oct-2026).
 */
export function normalizarCedula(valor: string): string {
  return valor.replace(/[\s-]/g, '')
}

export function esCedulaCrValida(valor: string): boolean {
  const c = normalizarCedula(valor)
  if (!/^\d+$/.test(c)) return false
  if (/^(\d)\1+$/.test(c)) return false
  if (c.length < 9 || c.length > 12) return false
  return c.length !== 9 || c[0] !== '0'
}
