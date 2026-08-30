import api from './api'
import type { Id } from '@/types/api'

export const ofertaService = {
  aplicar: (id: Id, enOferta: boolean, porcentajeDescuento: number) =>
    api.patch(`/productos/${id}/oferta`, { enOferta, porcentajeDescuento }),
  misPendientes: () => api.get('/mis-solicitudes/ofertas'),
}
