import { useState } from 'react'
import type { Id } from '@/types/api'
import { mensajeErrorPlan } from './useCambiarPlan'
import { MOTIVO_MAX, motivoSolicitudValido, solicitudCambioPlanService } from './solicitudCambioPlan'

type Props = {
  planId: Id
  planNombre?: string | null
  planActual?: string | null
  onCerrar: () => void
}

/** Bajar de plan sobre una suscripción cobrada: la pyme manda la solicitud y la revisamos (no cambia nada solo). */
export default function SolicitudCambioPlanForm({ planId, planNombre, planActual, onCerrar }: Props) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviada, setEnviada] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const enviar = async () => {
    if (!motivoSolicitudValido(motivo) || enviando) return
    setEnviando(true)
    setFallo(null)
    try {
      await solicitudCambioPlanService.solicitar(planId, motivo)
      setEnviada(true)
    } catch (e: unknown) {
      setFallo(mensajeErrorPlan(e, 'No pudimos mandar la solicitud. Probá de nuevo.'))
    } finally {
      setEnviando(false)
    }
  }

  if (enviada) {
    return (
      <div role="status" className="space-y-3 rounded-xl border border-hc-border p-4">
        <p className="text-sm font-semibold">Recibimos tu solicitud</p>
        <p className="text-sm text-hc-muted">La revisamos y te avisamos. Mientras tanto tu plan sigue igual y no se te cobró nada.</p>
        <button type="button" onClick={onCerrar} className="min-h-11 w-full rounded-[14px] border border-hc-border py-3 text-sm">Listo</button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-hc-border p-4">
      <p className="text-sm font-semibold">Solicitar cambio a {planNombre ?? 'otro plan'}</p>
      <p className="text-sm text-hc-muted">
        Tu plan{planActual ? ` ${planActual}` : ''} ya está cobrado, así que bajar no se hace solo. Contanos el motivo y lo revisamos.
      </p>
      <label className="block text-sm">
        <span className="font-medium">Motivo</span>
        <textarea
          value={motivo}
          maxLength={MOTIVO_MAX}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-hc-border p-2 text-sm"
        />
      </label>
      {fallo ? <p role="alert" className="text-sm text-red-600">{fallo}</p> : null}
      <div className="flex gap-2">
        <button type="button" onClick={onCerrar} className="min-h-11 flex-1 rounded-[14px] border border-hc-border py-3 text-sm">Cancelar</button>
        <button
          type="button"
          onClick={enviar}
          disabled={!motivoSolicitudValido(motivo) || enviando}
          className="min-h-11 flex-1 rounded-[14px] bg-hc-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {enviando ? 'Enviando…' : 'Mandar solicitud'}
        </button>
      </div>
    </div>
  )
}
