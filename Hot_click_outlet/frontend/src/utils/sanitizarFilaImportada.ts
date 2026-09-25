/**
 * Claves que, copiadas tal cual a un objeto, pueden alterar el prototipo en vez
 * de crear una propiedad propia (vector de prototype pollution).
 */
const CLAVES_PELIGROSAS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Reconstruye una fila parseada desde un archivo subido, descartando las claves
 * que pueden contaminar el prototipo.
 *
 * Los encabezados del archivo los controla quien lo sube, así que terminan como
 * claves del objeto que devuelve `sheet_to_json`. Se arma un objeto nuevo y se
 * copia con `defineProperty` para no disparar setters heredados.
 */
export function sanitizarFilaImportada(fila: Record<string, unknown>): Record<string, unknown> {
  const limpia: Record<string, unknown> = {}
  for (const clave of Object.keys(fila)) {
    if (CLAVES_PELIGROSAS.has(clave)) continue
    Object.defineProperty(limpia, clave, {
      value: fila[clave],
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  return limpia
}
