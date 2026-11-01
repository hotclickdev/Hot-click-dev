// useGrouping 'always' (ES2023, aún no tipado en el lib de TS): motores con agrupación mínima
// de 2 dígitos para es dejarían 6200 sin punto; los que no lo soportan lo toman como true.
const OPCIONES_MILES = {
  useGrouping: 'always',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
} as unknown as Intl.NumberFormatOptions

const formateadorMiles = new Intl.NumberFormat('es-CR', OPCIONES_MILES)

/**
 * Número entero con punto de miles (`6.200`), el formato de los montos en Figma.
 * Usa `Intl.NumberFormat('es-CR')` y cambia solo el separador de grupo (en es-CR es un NBSP).
 */
export const formatMiles = (valor: number) =>
  formateadorMiles
    .formatToParts(valor)
    .map((parte) => (parte.type === 'group' ? '.' : parte.value))
    .join('')

export const formatPrice = (price: number | string | null | undefined) =>
  `₡${formatMiles(Number(price) || 0)}`

export const formatDate = (date: string | number | Date) =>
  new Intl.DateTimeFormat('es-CR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))

export function formatDateShort(date?: string | number | Date | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatDateTime = (date: string | number | Date) =>
  new Intl.DateTimeFormat('es-CR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))

const CONDITION_LABEL: Record<string, string> = {
  NUEVO: 'Nuevo', COMO_NUEVO: 'Como nuevo', USADO: 'Usado',
}

export const conditionLabel = (cond: string) =>
  CONDITION_LABEL[cond] ?? cond

const CONDITION_VARIANT: Record<string, string> = {
  NUEVO: 'success', COMO_NUEVO: 'accent', USADO: 'warning',
}

export const conditionVariant = (cond: string) =>
  CONDITION_VARIANT[cond] ?? 'default'

/**
 * Único formato de dólares del front: `US$9`, `US$9,50`, `US$1.234,50` (coma decimal, punto de miles).
 * Recibe dólares (no centavos). `decimales` (2 por defecto) sirve para costos chicos de IA (`US$0,0123`).
 */
export function formatUSD(dolares: number | string | null | undefined, decimales = 2): string {
  const n = Number(dolares)
  const valor = Number.isFinite(n) ? n : 0
  const d = Math.max(0, Math.min(6, Math.trunc(decimales)))
  const escala = 10 ** d
  const unidades = Math.round(Math.abs(valor) * escala)
  const signo = valor < 0 && unidades > 0 ? '-' : ''
  const enteros = formatMiles(Math.floor(unidades / escala))
  const resto = unidades % escala
  return `${signo}US$${enteros}${resto === 0 ? '' : ',' + String(resto).padStart(d, '0')}`
}

/** US$ y ₡ con el formato único de utils/format (C3/C4); otra moneda, Intl con su código. */
export function formatMontoMoneda(monto: number, moneda: string | null | undefined, idioma: string): string {
  const m = (moneda || 'CRC').toUpperCase()
  if (m === 'USD') return formatUSD(monto)
  if (m === 'CRC') return formatPrice(monto)
  return new Intl.NumberFormat(idioma, { style: 'currency', currency: m, maximumFractionDigits: 0 }).format(monto)
}
