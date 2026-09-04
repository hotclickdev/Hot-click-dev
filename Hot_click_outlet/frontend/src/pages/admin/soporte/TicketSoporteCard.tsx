import { Link } from 'react-router-dom'
import type { Id } from '@/types/api'
import type { TicketSoporteItem } from '@/services/soporteService'
import {
  etiquetaEstadoTicket,
  puedeAsignarTicket,
  puedeResolverTicket,
  tonoEstadoTicket,
} from './soporteInboxHelpers'
import { formatDateShort } from '@/utils/format'

type Props = {
  ticket: TicketSoporteItem
  busyId: Id | null
  mostrarEmpresa?: boolean
  onAsignar: (id: Id) => void
  onResolver: (id: Id) => void
}

export default function TicketSoporteCard({
  ticket,
  busyId,
  mostrarEmpresa = true,
  onAsignar,
  onResolver,
}: Props) {
  const busy = busyId === ticket.id
  return (
    <li className="rounded-[14px] border border-hc-border p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-hc-text truncate">{ticket.titulo}</p>
          <p className="mt-1 text-xs text-hc-text whitespace-pre-wrap">{ticket.descripcion}</p>
          <p className="mt-2 text-[11px] text-hc-muted">
            {ticket.usuarioNombre || ticket.usuarioCorreo || 'Usuario'}
            {ticket.fechaCreacion ? ` · ${formatDateShort(ticket.fechaCreacion)}` : ''}
          </p>
          {mostrarEmpresa && ticket.empresaId != null && (
            <p className="mt-1 text-[11px] text-hc-muted">
              Tienda:{' '}
              <Link
                to={`/admin/soporte?empresaId=${ticket.empresaId}`}
                className="font-semibold text-hc-accent"
              >
                {ticket.empresaNombre || `#${ticket.empresaId}`}
              </Link>
            </p>
          )}
          {ticket.asignadoNombre && (
            <p className="mt-1 text-[11px] text-hc-muted">Asignado a {ticket.asignadoNombre}</p>
          )}
          {ticket.notasAdmin && (
            <p className="mt-2 text-xs text-hc-muted">Notas: {ticket.notasAdmin}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${tonoEstadoTicket(ticket.estado)}`}>
          {etiquetaEstadoTicket(ticket.estado)}
        </span>
      </div>
      {ticket.fotoUrl && (
        <a href={ticket.fotoUrl} target="_blank" rel="noreferrer" className="block">
          <img src={ticket.fotoUrl} alt="" className="max-h-40 rounded-xl object-cover border border-hc-border" />
        </a>
      )}
      {(puedeAsignarTicket(ticket.estado) || puedeResolverTicket(ticket.estado)) && (
        <div className="flex gap-2">
          {puedeAsignarTicket(ticket.estado) && ticket.estado === 'ABIERTO' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAsignar(ticket.id)}
              className="min-h-11 flex-1 rounded-xl border border-hc-border text-sm font-bold disabled:opacity-50"
            >
              Asignarme
            </button>
          )}
          {puedeResolverTicket(ticket.estado) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onResolver(ticket.id)}
              className="min-h-11 flex-1 rounded-xl bg-hc-primary text-white text-sm font-bold disabled:opacity-50"
            >
              Resolver
            </button>
          )}
        </div>
      )}
    </li>
  )
}
