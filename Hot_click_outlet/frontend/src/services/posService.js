import api from './api'
import axios from 'axios'

const publicApi = axios.create({ baseURL: api.defaults.baseURL })

export const posService = {
  crearVenta:    (dto)     => api.post('/pos/venta', dto).then(r => r.data),
  historial:     ()        => api.get('/pos/historial').then(r => r.data),
  abrirCaja:     (dto)     => api.post('/pos/caja/abrir', dto).then(r => r.data),
  cerrarCaja:    (id, dto) => api.put(`/pos/caja/${id}/cerrar`, dto).then(r => r.data),
  getCajaActiva: ()        => api.get('/pos/caja/activo').then(r => r.data),
  getHistorialCaja: ()     => api.get('/pos/caja/historial').then(r => r.data),
  getBodegas:    ()        => api.get('/bodegas').then(r => r.data),

  // QR payment sessions
  crearQrSesion:    (dto)          => api.post('/pos/qr', dto).then(r => r.data),
  confirmarSinpeQr: (token, dto)   => api.put(`/pos/qr/${token}/confirmar-sinpe`, dto).then(r => r.data),
  cancelarQrSesion: (token)        => api.delete(`/pos/qr/${token}`).then(r => r.data),

  // Public endpoints (no auth)
  infoQrSesion:   (token)          => publicApi.get(`/pos/qr/pago/${token}`).then(r => r.data),
  estadoQrSesion: (token)          => publicApi.get(`/pos/qr/pago/${token}/estado`).then(r => r.data),
  iniciarStripeQr: (token)         => publicApi.post(`/pos/qr/pago/${token}/stripe`).then(r => r.data),
}
