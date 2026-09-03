import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import { walletService } from '@/services/walletService'
import { formatoColonPayout } from './aprobaciones/bandejaModeracionHelpers'
import type { Id } from '@/types/api'

type PayoutAdmin = {
  id: Id
  empresaId?: number
  monto?: number
  metodo?: string
  destinoSinpe?: string
  nombreTitular?: string
  estado?: string
  notasSolicitante?: string
}

function listaPayouts(data: unknown): PayoutAdmin[] {
  if (Array.isArray(data)) return data as PayoutAdmin[]
  const inner = data && typeof data === 'object' ? (data as { data?: unknown }).data : null
  return Array.isArray(inner) ? inner as PayoutAdmin[] : []
}

export default function AdminPayouts() {
  const toast = useToast()
  const [items, setItems] = useState<PayoutAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<Id | null>(null)
  const [notas, setNotas] = useState('')

  async function cargar() {
    try {
      setLoading(true)
      const { data } = await walletService.adminPendientes()
      setItems(listaPayouts(data))
    } catch {
      toast({ message: 'No se pudieron cargar los retiros', type: 'error' })
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje
  }, [])

  async function aprobar(id: Id) {
    setBusyId(id)
    try {
      await walletService.adminAprobar(id, notas)
      toast({ message: 'Retiro aprobado', type: 'success' })
      setNotas('')
      await cargar()
    } catch {
      toast({ message: 'No se pudo aprobar el retiro', type: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  async function rechazar(id: Id) {
    if (!notas.trim()) {
      toast({ message: 'Indicá el motivo del rechazo', type: 'warning' })
      return
    }
    setBusyId(id)
    try {
      await walletService.adminRechazar(id, notas.trim())
      toast({ message: 'Retiro rechazado', type: 'success' })
      setNotas('')
      await cargar()
    } catch {
      toast({ message: 'No se pudo rechazar el retiro', type: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 pb-8 md:max-w-3xl">
      <div>
        <Link to="/admin/aprobaciones" className="text-sm font-semibold text-hc-accent">Volvé a Moderación</Link>
        <h1 className="mt-2 font-display text-[22px] font-bold text-hc-text">Retiros pendientes</h1>
        <p className="mt-0.5 text-xs text-hc-muted">Aprobá o rechazá payouts de billetera. El rechazo libera fondos al vendedor.</p>
      </div>

      <label className="block text-xs font-semibold text-hc-muted">
        Notas / motivo (obligatorio al rechazar)
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
        <p className="text-sm text-hc-muted py-8 text-center">No hay retiros pendientes.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((p) => (
            <li key={String(p.id)} className="rounded-[14px] border border-hc-border p-3.5 space-y-3">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-hc-text">Retiro #{p.id}</p>
                  <p className="text-[11px] text-hc-muted">Empresa {p.empresaId} · {p.metodo || 'SINPE'}</p>
                  {p.nombreTitular && <p className="text-[11px] text-hc-muted">{p.nombreTitular}</p>}
                  {p.destinoSinpe && <p className="text-[11px] font-mono text-hc-muted">{p.destinoSinpe}</p>}
                </div>
                <p className="text-sm font-bold text-hc-primary">{formatoColonPayout(p.monto)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => aprobar(p.id)}
                  className="min-h-11 flex-1 rounded-xl bg-hc-primary text-white text-sm font-bold disabled:opacity-50"
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => rechazar(p.id)}
                  className="min-h-11 flex-1 rounded-xl border border-hc-border text-sm font-bold disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
