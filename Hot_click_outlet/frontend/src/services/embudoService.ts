import api from './api'

export type ResumenEmbudo = {
  dias: number
  visita: number
  producto: number
  carrito: number
  checkout: number
  pagoIntento: number
  pedidosPagados: number
  busquedaVacia: number
  errorDatos: number
  errorEntrega: number
  sinComprobante: number
  pagoFallido: number
  pagoCancelado: number
  carritosPendientes: number
  carritosEmailEnviado: number
}

export const embudoService = {
  resumen(dias: 7 | 30) {
    return api.get<ResumenEmbudo>('/admin/embudo', { params: { dias } }).then((r) => r.data)
  },
}
