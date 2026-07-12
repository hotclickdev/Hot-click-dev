import api from './api'

export const ofertaService = {
  aplicar: (id, enOferta, porcentajeDescuento) =>
    api.patch(`/productos/${id}/oferta`, { enOferta, porcentajeDescuento }),
  misPendientes: () => api.get('/mis-solicitudes/ofertas'),
}
