/** Orígenes de importación (URL, PDF, CSV). */
export const TABS = [
  { id: 'url', label: 'URL del sitio' },
  { id: 'pdf', label: 'Catálogo PDF' },
  { id: 'csv', label: 'Archivo CSV' },
]

/** Condiciones de producto disponibles al importar. */
export const CONDICIONES = [
  { value: 'NUEVO',      label: 'Nuevo'      },
  { value: 'COMO_NUEVO', label: 'Como nuevo' },
  { value: 'USADO',      label: 'Usado'      },
]

/**
 * Formatea un monto en colones para inputs (sin símbolo ₡).
 * @param {number|string|null|undefined} v
 * @returns {string}
 */
export function fmtColones(v) {
  return (v || v === 0) ? Number(v).toLocaleString('es-CR') : ''
}

/**
 * Parsea un string con formato de colones a entero.
 * @param {string|null|undefined} str
 * @returns {number}
 */
export function parseColones(str) {
  return parseInt(String(str ?? '').replace(/[^0-9]/g, ''), 10) || 0
}
