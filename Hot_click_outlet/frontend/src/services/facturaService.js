import api from './api'

const facturaService = {
  emitir:    (pedidoId, tipo = '04') => api.post(`/facturas/emitir/${pedidoId}`, { tipo }),
  listar:    (page = 0, size = 20)  => api.get('/facturas', { params: { page, size } }),
  detalle:   (id)                   => api.get(`/facturas/${id}`),
  estado:    (id)                   => api.get(`/facturas/${id}/estado`),
}

export default facturaService
