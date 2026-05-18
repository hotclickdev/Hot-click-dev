import api from './api'

export const orderService = {
  create: (data) => api.post('/pedidos', data),
  getById: (id) => api.get(`/pedidos/${id}`),
  getByUser: (userId, page = 0, size = 20) => api.get(`/pedidos/usuario/${userId}?page=${page}&size=${size}`),
  getAll: () => api.get('/pedidos'),
  getPending: () => api.get('/pedidos/pendientes'),
  updateStatus: (id, estado) => api.put(`/pedidos/${id}/estado`, { estado }),
  asignarGuia:  (id, numeroGuia) => api.put(`/pedidos/${id}/guia`, { numeroGuia }),
  procesarEnvio:(id, guia, costoEnvio) => api.put(`/pedidos/${id}/envio`, { guia, costoEnvio }),
}

export const ventaService = {
  create: (data) => api.post('/ventas', data),
  getAll: () => api.get('/ventas'),
  getClientes: () => api.get('/ventas/clientes'),
}

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/usuarios'),
  getPendingUsers: () => api.get('/admin/usuarios/pendientes'),
  approveUser: (id, body = { rol: 'USUARIO_FINAL' }) => api.put(`/admin/usuarios/${id}/aprobar`, body),
  rejectUser: (id) => api.put(`/admin/usuarios/${id}/rechazar`),
  setRole: (id, rol) => api.put(`/admin/usuarios/${id}/rol`, { rol }),
  setStatus: (id, estado) => api.put(`/admin/usuarios/${id}/estado`, { estado }),
  deleteUser: (id) => api.delete(`/admin/usuarios/${id}`),
}

export const warehouseService = {
  getAll: () => api.get('/bodegas'),
  create: (data) => api.post('/bodegas', data),
  update: (id, data) => api.put(`/bodegas/${id}`, data),
  delete: (id) => api.delete(`/bodegas/${id}`),
  getStockMovements: (productoId) => api.get(`/stock/movimientos/${productoId}`),
  adjustStock: (productoId, data) => api.post(`/stock/ajuste-entrada/${productoId}`, data),
}
