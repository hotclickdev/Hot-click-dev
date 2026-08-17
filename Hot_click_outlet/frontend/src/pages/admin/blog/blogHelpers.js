export const EMPTY_BLOG_FORM = { titulo: '', resumen: '', contenido: '', imagenUrl: '', publicado: false }

/** @param {string|null|undefined} d */
export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}
