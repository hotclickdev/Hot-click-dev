import api from './api'

/** Cupones de descuento: validación pública y listado admin. */
export const cuponService = {
  validar: (codigo) => api.get(`/cupones/validar?codigo=${encodeURIComponent(codigo)}`),
  getAll: (params) => api.get('/cupones', { params }),
  getEstadisticas: () => api.get('/cupones/estadisticas'),
}
