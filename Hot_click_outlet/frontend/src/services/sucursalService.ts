import api from './api'
import type { Id } from '@/types/api'

export type SucursalDto = {
  id: Id
  nombre: string
  empresaId?: number
  activo: boolean
  /** Stub hasta haber métricas reales por sucursal */
  ventasMes: number
  fechaCreacion?: string
}

export const sucursalService = {
  getAll: () => api.get<SucursalDto[]>('/sucursales'),
  create: (nombre: string) => api.post<SucursalDto>('/sucursales', { nombre }),
}
