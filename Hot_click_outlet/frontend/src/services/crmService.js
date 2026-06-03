import api from './api'

export const crmService = {
  listarClientes:    ()        => api.get('/crm/clientes').then(r => r.data?.data ?? r.data ?? []),
  getCliente:        (id)      => api.get(`/crm/clientes/${id}`).then(r => r.data?.data ?? r.data),
  actualizarCliente: (id, dto) => api.put(`/crm/clientes/${id}`, dto).then(r => r.data),
  ajustarPuntos:     (id, delta) => api.post(`/crm/clientes/${id}/puntos`, { delta }).then(r => r.data),
  buscarClientes:    (q)       => api.get('/crm/clientes/buscar', { params: { q } }).then(r => r.data?.data ?? r.data ?? []),
}
