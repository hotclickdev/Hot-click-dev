export const ESTADO_LABEL = {
  TRIAL:    { label: 'Trial activo',   color: '#fbbf24' },
  ACTIVO:   { label: 'Activo',         color: '#22c55e' },
  PAST_DUE: { label: 'Pago pendiente', color: '#f87171' },
  VENCIDO:  { label: 'Vencido',        color: '#9ca3af' },
  CANCELADO:{ label: 'Cancelado',      color: '#9ca3af' },
  SIN_SUSCRIPCION: { label: 'Sin suscripción', color: '#9ca3af' },
}

export function fmtFechaSuscripcion(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function fmtMontoFactura(centavos, moneda) {
  return `${moneda?.toUpperCase() === 'USD' ? 'US$' : moneda} ${(centavos / 100).toFixed(2)}`
}

export function estiloEstadoFactura(estado) {
  const pagado = estado === 'PAGADO'
  return {
    backgroundColor: pagado ? '#16a34a22' : '#f8717122',
    color: pagado ? '#22c55e' : '#f87171',
  }
}

export function etiquetaEstadoFactura(estado) {
  return estado === 'PAGADO' ? 'Pagado' : estado
}
