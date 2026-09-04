import api from './api'
import type { Id } from '@/types/api'

export type FacturaFiltros = {
  estado?: string
  fechaDesde?: string
  fechaHasta?: string
}

const facturaService = {
  emitir:    (pedidoId: Id, tipo = '04') => api.post(`/facturas/emitir/${pedidoId}`, { tipo }),
  listar:    (page = 0, size = 20, filtros: FacturaFiltros = {}) =>
    api.get('/facturas', { params: { page, size, ...filtros } }),
  detalle:   (id: Id)                   => api.get(`/facturas/${id}`),
  estado:    (id: Id)                   => api.get(`/facturas/${id}/estado`),
}

export default facturaService
