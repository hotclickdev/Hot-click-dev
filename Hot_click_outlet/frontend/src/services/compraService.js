import api from './api'

export const compraService = {
  // Órdenes de compra
  listar:   ()        => api.get('/compras').then(r => r.data?.data ?? r.data ?? []),
  getById:  (id)      => api.get(`/compras/${id}`).then(r => r.data?.data ?? r.data),
  crear:    (dto)     => api.post('/compras', dto).then(r => r.data),
  recibir:  (id, dto) => api.put(`/compras/${id}/recibir`, dto).then(r => r.data),
  cancelar: (id)      => api.put(`/compras/${id}/cancelar`, {}).then(r => r.data),

  // Proveedores
  listarProveedores:   ()     => api.get('/proveedores').then(r => r.data?.data ?? r.data ?? []),
  crearProveedor:      (dto)  => api.post('/proveedores', dto).then(r => r.data),
  actualizarProveedor: (id, dto) => api.put(`/proveedores/${id}`, dto).then(r => r.data),
  eliminarProveedor:   (id)   => api.delete(`/proveedores/${id}`).then(r => r.data),
  historialCostosProveedor: (id) => api.get(`/proveedores/${id}/historial-costos`).then(r => r.data?.data ?? r.data ?? []),
}
