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

export function categoryEmoji(nombre) {
  const n = (nombre ?? '').toLowerCase()
  if (n.includes('ropa') || n.includes('tela') || n.includes('camis')) return '👕'
  if (n.includes('electro') || n.includes('celul') || n.includes('tecnol')) return '📱'
  if (n.includes('juguete') || n.includes('niño')) return '🧸'
  if (n.includes('deport') || n.includes('sport')) return '⚽'
  if (n.includes('comida') || n.includes('aliment') || n.includes('bebida')) return '🍔'
  if (n.includes('mueble') || n.includes('hogar') || n.includes('casa')) return '🛋️'
  if (n.includes('herram') || n.includes('tool')) return '🔧'
  if (n.includes('cosmetic') || n.includes('belleza') || n.includes('perfum')) return '💄'
  if (n.includes('libro') || n.includes('escolar') || n.includes('papeler')) return '📚'
  if (n.includes('auto') || n.includes('moto') || n.includes('vehic')) return '🚗'
  if (n.includes('mascota') || n.includes('pet')) return '🐾'
  if (n.includes('joya') || n.includes('acceso')) return '💍'
  return '📦'
}
