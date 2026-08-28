import api from './api'
import type { Id, JsonBody } from '@/types/api'

export const crmService = {
  listarClientes:    ()        => api.get('/crm/clientes').then(r => r.data?.data ?? r.data ?? []),
  getCliente:        (id: Id)      => api.get(`/crm/clientes/${id}`).then(r => r.data?.data ?? r.data),
  crearCliente:      (dto: JsonBody)     => api.post('/crm/clientes', dto).then(r => r.data?.data ?? r.data),
  actualizarCliente: (id: Id, dto: JsonBody) => api.put(`/crm/clientes/${id}`, dto).then(r => r.data),
  ajustarPuntos:     (id: Id, delta: number) => api.post(`/crm/clientes/${id}/puntos`, { delta }).then(r => r.data),
  buscarClientes:    (q: string)       => api.get('/crm/clientes/buscar', { params: { q } }).then(r => r.data?.data ?? r.data ?? []),
}
