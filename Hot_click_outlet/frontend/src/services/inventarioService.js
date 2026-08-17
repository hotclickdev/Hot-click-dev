import api from './api'

/** Dashboard y análisis AI de inventario. */
export const inventarioService = {
  getDashboard: () => api.get('/admin/inventario/dashboard'),
  analizar: () => api.post('/admin/inventario/analizar'),
}
