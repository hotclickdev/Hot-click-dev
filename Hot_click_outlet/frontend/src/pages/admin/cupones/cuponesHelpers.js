export const FILTERS = [
  { label: 'Todos',        value: undefined },
  { label: 'Disponibles',  value: false },
  { label: 'Usados',       value: true },
]

export const PAGE_SIZE = 50

/** @param {string|null|undefined} iso */
export function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}
