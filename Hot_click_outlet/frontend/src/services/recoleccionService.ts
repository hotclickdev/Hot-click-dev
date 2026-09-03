import api from '@/services/api'
import type { RecoleccionCreatePayload } from '@/features/recoleccion/recoleccionTipos'

export const recoleccionService = {
  crear: (data: RecoleccionCreatePayload) => api.post('/recolecciones', data),
  listar: () => api.get('/recolecciones'),
  indicarTarifa: (id: number, tarifaColones: number, notasAdmin?: string) =>
    api.put(`/recolecciones/${id}/tarifa`, { tarifaColones, notasAdmin: notasAdmin || null }),
  rechazar: (id: number, motivo: string) =>
    api.put(`/recolecciones/${id}/rechazar`, { motivo }),
  cancelar: (id: number) => api.put(`/recolecciones/${id}/cancelar`),
}
