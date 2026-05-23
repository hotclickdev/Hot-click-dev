export const formatPrice = (price) =>
  '₡' + new Intl.NumberFormat('es-CR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price ?? 0)

export const formatDate = (date) =>
  new Intl.DateTimeFormat('es-CR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))

export const formatDateTime = (date) =>
  new Intl.DateTimeFormat('es-CR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))

export const conditionLabel = (cond) =>
  ({ NUEVO: 'Nuevo', COMO_NUEVO: 'Como nuevo', USADO: 'Usado' }[cond] ?? cond)

export const conditionVariant = (cond) =>
  ({ NUEVO: 'success', COMO_NUEVO: 'accent', USADO: 'warning' }[cond] ?? 'default')

export const statusColor = (estado) => ({
  PENDIENTE: 'warning',
  ACTIVO: 'success',
  INACTIVO: 'default',
  COMPLETADO: 'success',
  DESPACHADO: 'accent',
  ENTREGADO: 'success',
  CANCELADO: 'danger',
}[estado] ?? 'default')
