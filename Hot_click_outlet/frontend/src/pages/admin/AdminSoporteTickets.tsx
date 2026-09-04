import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import { AdminFilterChip } from '@/prototipo/admin/AdminUi'
import { soporteService, type TicketSoporteItem } from '@/services/soporteService'
import type { Id } from '@/types/api'
import TicketSoporteCard from './soporte/TicketSoporteCard'
import {
  ESTADOS_TICKET_FILTRO,
  ticketsDesdeRespuesta,
} from './soporte/soporteInboxHelpers'

export default function AdminSoporteTickets() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const empresaIdParam = searchParams.get('empresaId')
  const estadoParam = searchParams.get('estado') || 'ALL'

  const [items, setItems] = useState<TicketSoporteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<Id | null>(null)
  const [notas, setNotas] = useState('')

  async function cargar() {
    try {
      setLoading(true)
      const { data } = await soporteService.listarAdmin({
        empresaId: empresaIdParam || undefined,
        estado: estadoParam === 'ALL' ? undefined : estadoParam,
      })
      setItems(ticketsDesdeRespuesta(data))
    } catch {
      toast({ message: 'No se pudieron cargar los tickets', type: 'error' })
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtros en URL
  }, [empresaIdParam, estadoParam])

  function setEstado(estado: string) {
    const next = new URLSearchParams(searchParams)
    if (estado === 'ALL') next.delete('estado')
    else next.set('estado', estado)
    setSearchParams(next)
  }

  async function asignar(id: Id) {
    setBusyId(id)
    try {
      await soporteService.asignar(id)
      toast({ message: 'Ticket asignado', type: 'success' })
      await cargar()
    } catch {
      toast({ message: 'No se pudo asignar el ticket', type: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  async function resolver(id: Id) {
    setBusyId(id)
    try {
      await soporteService.resolver(id, notas.trim() || undefined)
      toast({ message: 'Ticket resuelto', type: 'success' })
      setNotas('')
      await cargar()
    } catch {
      toast({ message: 'No se pudo resolver el ticket', type: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 pb-8 md:max-w-3xl">
      <div>
        <Link to="/admin/empresas" className="text-sm font-semibold text-hc-accent">
          Ir a Tiendas
        </Link>
        <h1 className="mt-2 font-display text-[22px] font-bold text-hc-text">Inbox de soporte</h1>
        <p className="mt-0.5 text-xs text-hc-muted">
          Tickets que envían los vendedores desde Ayuda. Podés filtrar por tienda desde la ficha.
        </p>
        {empresaIdParam && (
          <p className="mt-2 text-xs text-hc-muted">
            Filtrado por empresa #{empresaIdParam}.{' '}
            <button
              type="button"
              className="font-semibold text-hc-accent"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.delete('empresaId')
                setSearchParams(next)
              }}
            >
              Quitar filtro
            </button>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {ESTADOS_TICKET_FILTRO.map((f) => (
          <AdminFilterChip
            key={f.id}
            activo={estadoParam === f.id}
            onClick={() => setEstado(f.id)}
          >
            {f.label}
          </AdminFilterChip>
        ))}
      </div>

      <label className="block text-xs font-semibold text-hc-muted">
        Notas al resolver (opcional)
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-hc-border bg-hc-surface px-3 py-2 text-sm text-hc-text"
        />
      </label>

      {loading ? (
        <p className="text-sm text-hc-muted py-8 text-center">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-hc-muted py-8 text-center">No hay tickets con este filtro.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((t) => (
            <TicketSoporteCard
              key={String(t.id)}
              ticket={t}
              busyId={busyId}
              onAsignar={asignar}
              onResolver={resolver}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
