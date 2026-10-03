import api from './api'
import type { Id } from '@/types/api'

export type SucursalDto = {
  id: Id
  nombre: string
  ubicacion?: string | null
  empresaId?: number
  activo: boolean
  /** Stub del backend (siempre 0) hasta haber métricas reales por sucursal; la pantalla no lo muestra (decisión 3.9 B). */
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
