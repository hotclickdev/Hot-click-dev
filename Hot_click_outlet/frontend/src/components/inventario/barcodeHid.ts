/** Extrae código de un buffer HID (pistola) o tipeo manual. */
export function normalizarCodigoBarras(raw: string): string | null {
  const codigo = raw.trim()
  if (!codigo || codigo.length < 4) return null
  return codigo
}
