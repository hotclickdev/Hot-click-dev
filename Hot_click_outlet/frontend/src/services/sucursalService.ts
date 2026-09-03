import api from './api'
import type { Id } from '@/types/api'

export type SucursalDto = {
  id: Id
  nombre: string
  ubicacion?: string | null
  empresaId?: number
  activo: boolean
  /** Stub hasta haber métricas reales por sucursal */
  ventasMes: number
  fechaCreacion?: string
}

export const sucursalService = {
  getAll: () => api.get<SucursalDto[]>('/sucursales'),
  create: (payload: { nombre: string; ubicacion: string }) =>
    api.post<SucursalDto>('/sucursales', payload),
  renombrar: (id: Id, nombre: string) =>
    api.put<SucursalDto>(`/sucursales/${id}`, { nombre }),
  desactivar: (id: Id) => api.delete<SucursalDto>(`/sucursales/${id}`),
}
