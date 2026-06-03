import api from './api'

export const posService = {
  crearVenta:    (dto)     => api.post('/pos/venta', dto).then(r => r.data),
  historial:     ()        => api.get('/pos/historial').then(r => r.data),
  abrirCaja:     (dto)     => api.post('/pos/caja/abrir', dto).then(r => r.data),
  cerrarCaja:    (id, dto) => api.put(`/pos/caja/${id}/cerrar`, dto).then(r => r.data),
  getCajaActiva: ()        => api.get('/pos/caja/activo').then(r => r.data),
  getHistorialCaja: ()     => api.get('/pos/caja/historial').then(r => r.data),
}
