export const LANGUAGES = [
  { code: 'es', label: 'Español',   flagSrc: 'https://flagcdn.com/cr.svg', country: 'CR' },
  { code: 'en', label: 'English',   flagSrc: 'https://flagcdn.com/us.svg', country: 'US' },
  { code: 'pt', label: 'Português', flagSrc: 'https://flagcdn.com/br.svg', country: 'BR' },
]

export const COLOR_FILTERS = [
  { value: 'none',         label: 'Normal',         desc: 'Todos los colores',         dot: 'var(--hc-blue-400)' },
  { value: 'grayscale',    label: 'Sin color',       desc: 'Escala de grises',          dot: '#888' },
  { value: 'deuteranopia', label: 'Dalton. verde',   desc: 'Dificultad para ver verde', dot: '#22c55e' },
  { value: 'protanopia',   label: 'Dalton. rojo',    desc: 'Dificultad para ver rojo',  dot: '#ef4444' },
  { value: 'tritanopia',   label: 'Dalton. azul',    desc: 'Dificultad para ver azul',  dot: '#3b82f6' },
]
