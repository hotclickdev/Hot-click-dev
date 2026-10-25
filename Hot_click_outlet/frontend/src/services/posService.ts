import api from './api'
import axios from 'axios'
import type { Id, JsonBody } from '@/types/api'

const publicApi = axios.create({ baseURL: api.defaults.baseURL })

/** Destino ONVO de config y monto exacto en colones que devuelve el backend. */
export type SinpeOnvoQrDatos = { destino: string; monto: number; moneda: string; expiracion: string }

export const posService = {
  crearVenta:    (dto: JsonBody)     => api.post('/pos/venta', dto).then(r => r.data),
  historial:     ()        => api.get('/pos/historial').then(r => r.data),
  abrirCaja:     (dto: JsonBody)     => api.post('/pos/caja/abrir', dto).then(r => r.data),
  cerrarCaja:    (id: Id, dto: JsonBody) => api.put(`/pos/caja/${id}/cerrar`, dto).then(r => r.data),
  getCajaActiva: ()        => api.get('/pos/caja/activo').then(r => r.data),
  getHistorialCaja: ()     => api.get('/pos/caja/historial').then(r => r.data),
  getBodegas:    ()        => api.get('/bodegas').then(r => r.data),

  // QR payment sessions
  crearQrSesion:    (dto: JsonBody)          => api.post('/pos/qr', dto).then(r => r.data),
  confirmarSinpeQr: (token: string, dto: JsonBody)   => api.put(`/pos/qr/${token}/confirmar-sinpe`, dto).then(r => r.data),
  cancelarQrSesion: (token: string)        => api.delete(`/pos/qr/${token}`).then(r => r.data),

  // Public endpoints (no auth)
  infoQrSesion:   (token: string)          => publicApi.get(`/pos/qr/pago/${token}`).then(r => r.data),
  estadoQrSesion: (token: string)          => publicApi.get(`/pos/qr/pago/${token}/estado`).then(r => r.data),
  comprobanteQrSesion: (token: string)     => publicApi.get(`/pos/qr/pago/${token}/comprobante`).then(r => r.data),
  // Tarjeta y SINPE Móvil por Tilopay (ONVO ya no se usa en el POS)
  /** SINPE Móvil por ONVO: crea y confirma el intent con la identificación del pagador. */
  iniciarSinpeOnvoQr: (token: string, identificacion: string, tipoIdentificacion: number) =>
    publicApi.post<SinpeOnvoQrDatos>(`/pos/qr/pago/${token}/sinpe-onvo`, { identificacion, tipoIdentificacion }).then(r => r.data),
  iniciarTilopayQr: (token: string, metodo?: 'TARJETA') =>
    publicApi.post(`/pos/qr/pago/${token}/tilopay`, null, { params: metodo ? { metodo } : undefined }).then(r => r.data),
  confirmarTilopayQr: (token: string)      =>
    publicApi.post<{ pagado: boolean }>(`/pos/qr/pago/${token}/tilopay/confirmar`).then(r => r.data),
}
