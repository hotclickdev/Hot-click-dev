import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { recoleccionService } from '@/services/recoleccionService'
import type { SolicitudRecoleccion } from '@/features/recoleccion/recoleccionTipos'

type Props = Readonly<{
  seleccion: SolicitudRecoleccion
  onCerrar: () => void
  onOk: () => Promise<void>
}>

export default function AdminRecoleccionDrawer({ seleccion, onCerrar, onOk }: Props) {
  const toast = useToast()
  const [tarifa, setTarifa] = useState(seleccion.tarifaColones ? String(seleccion.tarifaColones) : '')
  const [notas, setNotas] = useState(seleccion.notasAdmin ?? '')
  const [busy, setBusy] = useState(false)
  const pendiente = seleccion.estado === 'PENDIENTE'

  async function indicarTarifa() {
    const monto = Number(tarifa)
    if (!monto || monto < 1) {
      toast({ message: 'Indicá la tarifa en colones', type: 'warning' })
      return
    }
    setBusy(true)
    try {
      await recoleccionService.indicarTarifa(seleccion.id, monto, notas.trim() || undefined)
      toast({ message: 'Tarifa enviada al vendedor', type: 'success' })
      await onOk()
    } catch (err: unknown) {
      toast({ message: mensajeError(err), type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function rechazar() {
    if (!notas.trim()) {
      toast({ message: 'Escribí el motivo del rechazo', type: 'warning' })
      return
    }
    setBusy(true)
    try {
      await recoleccionService.rechazar(seleccion.id, notas.trim())
      toast({ message: 'Solicitud rechazada', type: 'success' })
      await onOk()
    } catch (err: unknown) {
      toast({ message: mensajeError(err), type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-hc-surface p-5" role="dialog" aria-labelledby="recoleccion-titulo">
        <h2 id="recoleccion-titulo" className="font-display text-lg font-bold">{seleccion.empresaNombre}</h2>
        <p className="mt-3 text-sm"><strong>Recolección:</strong> {seleccion.direccionRecoleccion}</p>
        <p className="text-sm">{seleccion.contactoRecoleccion} · {seleccion.telefonoRecoleccion}</p>
        <p className="mt-2 text-sm"><strong>Entrega:</strong> {seleccion.direccionEntrega}</p>
        <p className="text-sm">{seleccion.contactoEntrega} · {seleccion.telefonoEntrega}</p>
        {seleccion.notas ? <p className="mt-2 text-sm text-hc-muted">{seleccion.notas}</p> : null}
        {pendiente ? (
          <>
            <label className="mt-4 block text-xs font-medium text-hc-muted">
              Tarifa (colones)
              <input type="number" min={1} value={tarifa} onChange={(e) => setTarifa(e.target.value)} className="mt-1 min-h-12 w-full rounded-xl bg-hc-surface-2 px-3.5 text-sm" />
            </label>
            <label className="mt-3 block text-xs font-medium text-hc-muted">
              Nota al vendedor / motivo
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} className="mt-1 w-full rounded-xl bg-hc-surface-2 px-3.5 py-3 text-sm" />
            </label>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" disabled={busy} onClick={indicarTarifa} className="min-h-11 rounded-[14px] bg-hc-primary font-bold text-white">Indicar tarifa</button>
              <button type="button" disabled={busy} onClick={rechazar} className="min-h-11 rounded-[14px] border border-hc-border font-bold">Rechazar</button>
            </div>
          </>
        ) : null}
        <button type="button" onClick={onCerrar} className="mt-3 min-h-11 w-full text-sm font-semibold text-hc-muted">Cerrar</button>
      </div>
    </div>
  )
}

function mensajeError(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  return msg || 'No se pudo guardar'
}
