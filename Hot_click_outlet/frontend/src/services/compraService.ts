import api from './api'
import type { Id, JsonBody } from '@/types/api'

export const compraService = {
  // Órdenes de compra
  listar:   ()        => api.get('/compras').then(r => r.data?.data ?? r.data ?? []),
  getById:  (id: Id)      => api.get(`/compras/${id}`).then(r => r.data?.data ?? r.data),
  crear:    (dto: JsonBody)     => api.post('/compras', dto).then(r => r.data),
  recibir:  (id: Id, dto: JsonBody) => api.put(`/compras/${id}/recibir`, dto).then(r => r.data),
  cancelar: (id: Id)      => api.put(`/compras/${id}/cancelar`, {}).then(r => r.data),

  // Proveedores
  listarProveedores:   ()     => api.get('/proveedores').then(r => r.data?.data ?? r.data ?? []),
  crearProveedor:      (dto: JsonBody)  => api.post('/proveedores', dto).then(r => r.data),
  actualizarProveedor: (id: Id, dto: JsonBody) => api.put(`/proveedores/${id}`, dto).then(r => r.data),
  eliminarProveedor:   (id: Id)   => api.delete(`/proveedores/${id}`).then(r => r.data),
  historialCostosProveedor: (id: Id) => api.get(`/proveedores/${id}/historial-costos`).then(r => r.data?.data ?? r.data ?? []),
}
