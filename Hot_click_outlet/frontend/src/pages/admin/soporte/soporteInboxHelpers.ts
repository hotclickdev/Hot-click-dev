import type { TicketSoporteEstado, TicketSoporteItem } from '@/services/soporteService'

export const ESTADOS_TICKET_FILTRO = [
  { id: 'ALL', label: 'Todos' },
  { id: 'ABIERTO', label: 'Abiertos' },
  { id: 'ASIGNADO', label: 'Asignados' },
  { id: 'RESUELTO', label: 'Resueltos' },
] as const

export function etiquetaEstadoTicket(estado?: string): string {
  if (estado === 'ABIERTO') return 'Abierto'
  if (estado === 'ASIGNADO') return 'Asignado'
  if (estado === 'RESUELTO') return 'Resuelto'
  return estado || '—'
}

export function tonoEstadoTicket(estado?: string): string {
  if (estado === 'ABIERTO') return 'bg-amber-500/15 text-amber-400'
  if (estado === 'ASIGNADO') return 'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)]'
  if (estado === 'RESUELTO') return 'bg-green-500/15 text-green-400'
  return 'bg-hc-surface-2 text-hc-muted'
}

export function puedeAsignarTicket(estado?: string): boolean {
  return estado === 'ABIERTO' || estado === 'ASIGNADO'
}

export function puedeResolverTicket(estado?: string): boolean {
  return estado === 'ABIERTO' || estado === 'ASIGNADO'
}

export function ticketsDesdeRespuesta(data: unknown): TicketSoporteItem[] {
  if (Array.isArray(data)) return data as TicketSoporteItem[]
  const inner = (data as { data?: TicketSoporteItem[] } | null)?.data
  return Array.isArray(inner) ? inner : []
}

export function filtrarTicketsLocales(
  tickets: TicketSoporteItem[],
  estado: string,
): TicketSoporteItem[] {
  if (!estado || estado === 'ALL') return tickets
  return tickets.filter((t) => t.estado === (estado as TicketSoporteEstado))
}
