import api from './api'
import type { Id, JsonBody } from '@/types/api'

export const orderService = {
  create: (data: JsonBody) => api.post('/pedidos', data),
  createManual: (data: JsonBody) => api.post('/pedidos/manual', data),
  getById: (id: Id) => api.get(`/pedidos/${id}`),
  getByUser: (userId: Id, page = 0, size = 20) => api.get(`/pedidos/usuario/${userId}?page=${page}&size=${size}`),
  getAll: () => api.get('/pedidos'),
  getPending: () => api.get('/pedidos/pendientes'),
  updateStatus: (id: Id, estado: string, nota?: string | null) => api.put(`/pedidos/${id}/estado`, { estado, nota: nota || null }),
  asignarGuia:  (id: Id, numeroGuia: string) => api.put(`/pedidos/${id}/guia`, { numeroGuia }),
  procesarEnvio:(id: Id, guia: string, costoEnvio: number) => api.put(`/pedidos/${id}/envio`, { guia, costoEnvio }),
  delete: (id: Id) => api.delete(`/pedidos/${id}`),
  notificar: (id: Id) => api.post(`/pedidos/${id}/notificar`),
}

export const ventaService = {
  create: (data: JsonBody) => api.post('/ventas', data),
  getAll: (page = 0, size = 300) => api.get('/ventas', { params: { page, size } }),
  getClientes: () => api.get('/ventas/clientes'),
}

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/usuarios'),
  getPendingUsers: () => api.get('/admin/usuarios/pendientes'),
  approveUser: (id: Id, body: JsonBody = { rol: 'USUARIO_FINAL' }) => api.put(`/admin/usuarios/${id}/aprobar`, body),
  rejectUser: (id: Id) => api.put(`/admin/usuarios/${id}/rechazar`),
  setRole: (id: Id, rol: string) => api.put(`/admin/usuarios/${id}/rol`, { rol }),
  setStatus: (id: Id, estado: string) => api.put(`/admin/usuarios/${id}/estado`, { estado }),
  blockUser: (id: Id) => api.put(`/admin/usuarios/${id}/bloquear`),
  unblockUser: (id: Id) => api.put(`/admin/usuarios/${id}/desbloquear`),
  deleteUser: (id: Id) => api.delete(`/admin/usuarios/${id}`),
  restoreUser: (id: Id) => api.put(`/admin/usuarios/${id}/restaurar`),
  getEmpresas: () => api.get('/admin/empresas'),
  getEmpresa: (id: Id) => api.get(`/admin/empresas/${id}`),
  getEmpresaTab: (id: Id, tab: string, params?: Record<string, unknown>) =>
    api.get(`/admin/empresas/${id}/${tab}`, params ? { params } : undefined),
  setEmpresaPlan: (id: Id, plan: string) => api.put(`/admin/empresas/${id}/plan`, { plan }),
  setEmpresaEstado: (id: Id, estadoEmpresa: string) =>
    api.put(`/admin/empresas/${id}/estado`, { estadoEmpresa }),
  setEmpresaVisibilidad: (id: Id, visibilidadPublica: boolean) =>
    api.put(`/admin/empresas/${id}/visibilidad`, { visibilidadPublica }),
  impersonarEmpresa: (id: Id) => api.post(`/admin/empresas/${id}/impersonar`),
  // Fuera de /admin/** a propósito: quien cierra la sesión está autenticado como
  // el usuario impersonado, no como ADMIN (ver ImpersonacionController en el backend).
  finalizarImpersonacion: (id: Id) => api.post(`/impersonacion/${id}/finalizar`),
  getUsuario: (id: Id) => api.get(`/usuarios/${id}`),
  updateUsuario: (id: Id, body: JsonBody) => api.put(`/usuarios/${id}`, body),
  health: () => api.get('/health'),
  resetDatos: () => api.post('/admin/reset-datos'),
  borrarPedidosCancelados: () => api.delete('/admin/pedidos/cancelados'),
}

export const warehouseService = {
  getAll: (params?: Record<string, unknown>) => api.get('/bodegas', params ? { params } : undefined),
  create: (data: JsonBody) => api.post('/bodegas', data),
  update: (id: Id, data: JsonBody) => api.put(`/bodegas/${id}`, data),
  delete: (id: Id) => api.delete(`/bodegas/${id}`),
  importBulk: (items: JsonBody[]) => api.post('/bodegas/bulk', items),
  getStockMovements: (productoId: Id) => api.get(`/stock/movimientos/${productoId}`),
  adjustStock: (productoId: Id, data: JsonBody) => api.post(`/stock/ajuste-entrada/${productoId}`, data),
}

export const categoriaService = {
  getAll: () => api.get('/categorias'),
  create: (data: JsonBody) => api.post('/categorias', data),
  update: (id: Id, data: JsonBody) => api.put(`/categorias/${id}`, data),
  delete: (id: Id) => api.delete(`/categorias/${id}`),
  importBulk: (items: JsonBody[]) => api.post('/categorias/bulk', items),
}
