import api from './api'
import type { Id } from '@/types/api'

export type TicketSoporteEstado = 'ABIERTO' | 'ASIGNADO' | 'RESUELTO'

export type TicketSoporteItem = {
  id: Id
  titulo: string
  descripcion: string
  fotoUrl?: string | null
  estado: TicketSoporteEstado | string
  notasAdmin?: string | null
  fechaCreacion?: string
  fechaAsignacion?: string | null
  fechaResolucion?: string | null
  empresaId?: Id
  empresaNombre?: string
  empresaSlug?: string
  usuarioId?: Id
  usuarioNombre?: string
  usuarioCorreo?: string
  asignadoId?: Id
  asignadoNombre?: string
  asignadoCorreo?: string
}

export const soporteService = {
  subirFoto: (formData: FormData) =>
    api.post('/soporte/tickets/fotos', formData, { headers: { 'Content-Type': undefined } }),

  crearTicket: ({ titulo, descripcion, fotoUrl }: { titulo: string; descripcion: string; fotoUrl?: string }) =>
    api.post('/soporte/tickets', { titulo, descripcion, fotoUrl }),

  listarAdmin: (params?: { empresaId?: Id; estado?: string }) =>
    api.get('/admin/soporte/tickets', { params }),

  asignar: (id: Id) =>
    api.put(`/admin/soporte/tickets/${id}`, { accion: 'ASIGNAR' }),

  resolver: (id: Id, notasAdmin?: string) =>
    api.put(`/admin/soporte/tickets/${id}`, { accion: 'RESOLVER', notasAdmin }),
}
