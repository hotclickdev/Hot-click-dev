import api from './api'

export type TiendaEnGracia = { empresaId: number; nombreEmpresa: string | null; fechaFin: string; ultimoDiaVenta: string; diasRestantes: number }
export type TiendaSuspendida = {
  empresaId: number; nombreEmpresa: string | null; estado: 'SUSPENDIDO_IMPAGO' | 'EXTENSION_IMPAGO'
  extensionDisponible: boolean; extensionVenceEn?: string | null; extensionMotivo?: string | null
}
export type PanelImpago = { diasGracia: number; diasExtension: number; enGracia: TiendaEnGracia[]; suspendidas: TiendaSuspendida[] }

/** Solo ADMIN: el backend responde 403 a cualquier otro rol. */
export const adminSuspensionService = {
  listar: () => api.get<{ data: PanelImpago }>('/admin/suspensiones'),
  suspender: (empresaId: number, motivo: string) => api.post(`/admin/suspensiones/${empresaId}/suspender`, { motivo }),
  darExtension: (empresaId: number, motivo: string) => api.post(`/admin/suspensiones/${empresaId}/extension`, { motivo }),
}
