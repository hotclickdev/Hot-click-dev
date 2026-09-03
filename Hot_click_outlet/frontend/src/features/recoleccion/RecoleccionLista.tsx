import { useEffect, useState } from 'react'
import { ETIQUETA_ESTADO, type SolicitudRecoleccion } from './recoleccionTipos'
import { formatoTarifa } from './recoleccionHelpers'

type Props = Readonly<{
  solicitudes: SolicitudRecoleccion[]
  onCancelar?: (id: number) => void
  cancelandoId?: number | null
}>

const CLASE_CTA_PRIMARIO =
  'flex min-h-11 w-full items-center justify-center rounded-[14px] bg-hc-primary px-5 py-4 text-[15px] font-bold text-white disabled:opacity-60'
const CLASE_CTA_SECUNDARIO =
  'flex min-h-11 w-full items-center justify-center rounded-[14px] border border-hc-border py-3.5 text-[13px] font-medium text-hc-text disabled:opacity-40'
const CLASE_CANCELAR_INICIAL =
  'mt-3 flex min-h-11 w-full items-center justify-center rounded-[14px] border border-hc-primary py-3.5 text-[13px] font-medium text-hc-primary disabled:opacity-40'

function resumirDireccion(direccion: string, max = 80): string {
  const texto = direccion.trim()
  if (texto.length <= max) return texto
  return `${texto.slice(0, max)}…`
}

type CancelarProps = Readonly<{
  solicitud: SolicitudRecoleccion
  cancelando: boolean
  confirmando: boolean
  onPedirConfirmacion: () => void
  onConfirmar: () => void
  onVolver: () => void
}>

function AccionesCancelar({
  solicitud,
  cancelando,
  confirmando,
  onPedirConfirmacion,
  onConfirmar,
  onVolver,
}: CancelarProps) {
  if (!confirmando) {
    return (
      <button
        type="button"
        disabled={cancelando}
        onClick={onPedirConfirmacion}
        className={CLASE_CANCELAR_INICIAL}
      >
        Cancelar solicitud
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-hc-border bg-hc-surface-2 p-3">
      <p className="text-sm font-medium text-hc-text">¿Cancelar esta solicitud de recolección?</p>
      <p className="mt-1 text-xs text-hc-muted">{resumirDireccion(solicitud.direccionRecoleccion)}</p>
      <div className="mt-3 flex flex-col gap-2">
        <button type="button" disabled={cancelando} onClick={onConfirmar} className={CLASE_CTA_PRIMARIO}>
          {cancelando ? 'Cancelando…' : 'Sí, cancelar solicitud'}
        </button>
        <button type="button" disabled={cancelando} onClick={onVolver} className={CLASE_CTA_SECUNDARIO}>
          No, volver
        </button>
      </div>
    </div>
  )
}

export default function RecoleccionLista({ solicitudes, onCancelar, cancelandoId }: Props) {
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)

  useEffect(() => {
    if (confirmandoId === null) return
    const siguePendiente = solicitudes.some((s) => s.id === confirmandoId && s.estado === 'PENDIENTE')
    if (!siguePendiente) setConfirmandoId(null)
  }, [solicitudes, confirmandoId])

  if (solicitudes.length === 0) {
    return <p className="text-sm text-hc-muted">Todavía no pediste recolección.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {solicitudes.map((s) => (
        <li key={s.id} className="rounded-xl border border-hc-border bg-hc-surface p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{ETIQUETA_ESTADO[s.estado] ?? s.estado}</p>
            <p className="text-sm font-bold text-hc-primary">{formatoTarifa(s.tarifaColones)}</p>
          </div>
          <p className="mt-2 text-xs text-hc-muted">Recolección: {s.direccionRecoleccion}</p>
          <p className="text-xs text-hc-muted">Entrega: {s.direccionEntrega}</p>
          {s.notasAdmin ? <p className="mt-2 text-xs">Nota HOTCLICK: {s.notasAdmin}</p> : null}
          {s.estado === 'PENDIENTE' && onCancelar ? (
            <AccionesCancelar
              solicitud={s}
              cancelando={cancelandoId === s.id}
              confirmando={confirmandoId === s.id}
              onPedirConfirmacion={() => setConfirmandoId(s.id)}
              onConfirmar={() => onCancelar(s.id)}
              onVolver={() => setConfirmandoId(null)}
            />
          ) : null}
        </li>
      ))}
    </ul>
  )
}
