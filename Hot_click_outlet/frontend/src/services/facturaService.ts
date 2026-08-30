import api from './api'
import type { Id } from '@/types/api'

const facturaService = {
  emitir:    (pedidoId: Id, tipo = '04') => api.post(`/facturas/emitir/${pedidoId}`, { tipo }),
  listar:    (page = 0, size = 20)  => api.get('/facturas', { params: { page, size } }),
  detalle:   (id: Id)                   => api.get(`/facturas/${id}`),
  estado:    (id: Id)                   => api.get(`/facturas/${id}/estado`),
}

export default facturaService
