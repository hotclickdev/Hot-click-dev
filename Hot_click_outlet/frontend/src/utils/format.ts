const formateadorMiles = new Intl.NumberFormat('es-CR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

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

const STATUS_COLOR: Record<string, string> = {
  PENDIENTE: 'warning',
  ACTIVO: 'success',
  INACTIVO: 'default',
  COMPLETADO: 'success',
  DESPACHADO: 'accent',
  ENTREGADO: 'success',
  CANCELADO: 'danger',
}

export const statusColor = (estado: string) => STATUS_COLOR[estado] ?? 'default'
