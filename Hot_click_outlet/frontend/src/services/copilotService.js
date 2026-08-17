import api from './api'

/** AI Copilot del panel admin. */
export const copilotService = {
  getHistorial: () => api.get('/admin/ai/historial'),
  getUso: () => api.get('/admin/ai/uso'),
  getSugerencias: () => api.get('/admin/ai/sugerencias'),
  getProductosSinVenta: () => api.get('/admin/ai/productos-sin-venta'),
  deleteHistorial: () => api.delete('/admin/ai/historial'),
}
