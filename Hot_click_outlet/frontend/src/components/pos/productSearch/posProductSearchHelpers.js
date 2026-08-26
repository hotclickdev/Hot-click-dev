export const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export const CAT_COLORS = [
  { bg: 'rgba(23,71,168,0.15)',  border: 'rgba(23,71,168,0.35)',  text: '#7aa3ff' },
  { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.35)', text: '#34d399' },
  { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.35)', text: '#fbbf24' },
  { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)',  text: '#f87171' },
  { bg: 'rgba(100,144,234,0.15)', border: 'rgba(100,144,234,0.35)', text: 'var(--hc-blue-400)' },
  { bg: 'rgba(229,169,61,0.15)', border: 'rgba(229,169,61,0.35)', text: '#E5A93D' },
  { bg: 'rgba(20,184,166,0.15)', border: 'rgba(20,184,166,0.35)', text: '#14b8a6' },
  { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.35)', text: '#ec4899' },
]

export function CatColor(idx) { return CAT_COLORS[idx % CAT_COLORS.length] }

/** Lista de un GET que puede venir cruda o envuelta en ResponseDTO. */
export function listaDesdeRespuesta(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.content)) return data.content
  return []
}
