export const LANGUAGES = [
  { code: 'es', label: 'Español',   flagSrc: 'https://flagcdn.com/cr.svg', country: 'CR' },
  { code: 'en', label: 'English',   flagSrc: 'https://flagcdn.com/us.svg', country: 'US' },
  { code: 'pt', label: 'Português', flagSrc: 'https://flagcdn.com/br.svg', country: 'BR' },
] as const

export type ColorFilterValue = 'none' | 'grayscale' | 'deuteranopia' | 'protanopia' | 'tritanopia'

/** Valores de filtro; labels/desc se resuelven con i18n en el panel. */
export const COLOR_FILTERS: { value: ColorFilterValue; labelKey: string; descKey: string; dot: string }[] = [
  { value: 'none',         labelKey: 'a11y.filtroNormal',       descKey: 'a11y.filtroNormalDesc',       dot: 'var(--hc-blue-400)' },
  { value: 'grayscale',    labelKey: 'a11y.filtroGrayscale',    descKey: 'a11y.filtroGrayscaleDesc',    dot: '#888' },
  { value: 'deuteranopia', labelKey: 'a11y.filtroDeuteranopia', descKey: 'a11y.filtroDeuteranopiaDesc', dot: '#22c55e' },
  { value: 'protanopia',   labelKey: 'a11y.filtroProtanopia',   descKey: 'a11y.filtroProtanopiaDesc',   dot: '#ef4444' },
  { value: 'tritanopia',   labelKey: 'a11y.filtroTritanopia',   descKey: 'a11y.filtroTritanopiaDesc',   dot: '#3b82f6' },
]
