import api from './api'

// ── Clientes B2B ─────────────────────────────────────────────────────────────

export const cotizacionClienteService = {
  listar: () => api.get('/cotizaciones/clientes').then(r => r.data),
  crear:  (dto) => api.post('/cotizaciones/clientes', dto).then(r => r.data),
  actualizar: (id, dto) => api.put(`/cotizaciones/clientes/${id}`, dto).then(r => r.data),
  eliminar:   (id) => api.delete(`/cotizaciones/clientes/${id}`).then(r => r.data),
}

// ── Cotizaciones B2B ─────────────────────────────────────────────────────────

export const cotizacionService = {
  listar:       (estado) => api.get('/cotizaciones', { params: { estado } }).then(r => r.data),
  kpis:         ()       => api.get('/cotizaciones/kpis').then(r => r.data),
  detalle:      (id)     => api.get(`/cotizaciones/${id}`).then(r => r.data),
  crear:        (dto)    => api.post('/cotizaciones', dto).then(r => r.data),
  actualizar:   (id, dto) => api.put(`/cotizaciones/${id}`, dto).then(r => r.data),
  cambiarEstado:(id, estado) => api.put(`/cotizaciones/${id}/estado`, null, { params: { estado } }).then(r => r.data),
  duplicar:     (id)     => api.post(`/cotizaciones/${id}/duplicar`).then(r => r.data),
  eliminar:     (id)     => api.delete(`/cotizaciones/${id}`).then(r => r.data),
  publica:      (token)  => api.get(`/cotizaciones/publica/${token}`).then(r => r.data),
}

// ── Helpers de formato ────────────────────────────────────────────────────────

export const ESTADOS_COTIZACION = [
  { value: 'BORRADOR',  label: 'Borrador',  color: 'var(--hc-muted)' },
  { value: 'ENVIADA',   label: 'Enviada',   color: '#3b82f6' },
  { value: 'APROBADA',  label: 'Aprobada',  color: '#22c55e' },
  { value: 'RECHAZADA', label: 'Rechazada', color: '#ef4444' },
]

export function labelEstado(estado) {
  return ESTADOS_COTIZACION.find(e => e.value === estado) ?? { label: estado, color: 'var(--hc-muted)' }
}

export function formatMonto(monto, moneda = 'CRC') {
  if (moneda === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format((monto ?? 0) / 100)
  }
  return `₡${new Intl.NumberFormat('es-CR').format(monto ?? 0)}`
}
