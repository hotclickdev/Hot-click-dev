import api from './api'
import type { Id } from '@/types/api'

/** Alta por fases: panel del dueño (la empresa sale del token, nunca se manda un id) y vistas del admin. */
export const altaNegocioService = {
  estado: () => api.get('/empresa/alta-negocio/estado'),
  enlaceOnvo: () => api.post('/empresa/alta-negocio/onvo-enlace'),
}

export const altaFasesAdminService = {
  revision: () => api.get('/admin/alta-fases/revision'),
  reintegros: () => api.get('/admin/reintegros'),
  marcarPago: (pagoId: Id, nota?: string) => api.post(`/admin/reintegros/pagos/${pagoId}/reintegrado`, { nota: nota ?? '' }),
  marcarNegocio: (empresaId: Id, nota?: string) => api.post(`/admin/reintegros/negocios/${empresaId}/reintegrado`, { nota: nota ?? '' }),
}
