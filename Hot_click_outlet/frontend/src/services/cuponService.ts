import api from './api'
import type { JsonBody } from '@/types/api'

/** Cupones de descuento: validación pública y listado admin. */
export const cuponService = {
  validar: (codigo: string) => api.get(`/cupones/validar?codigo=${encodeURIComponent(codigo)}`),
  getAll: (params: JsonBody) => api.get('/cupones', { params }),
  getEstadisticas: () => api.get('/cupones/estadisticas'),
}
