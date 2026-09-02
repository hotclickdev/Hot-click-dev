import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { soporteService } from '@/services/soporteService'
import {
  POS_REPORTE_TIPOS,
  etiquetaTipoReporte,
  type PosReporteTipoId,
} from '@/features/pos-pago/posReporteTipos'
import { posUi } from './posApariencia'

type Props = {
  open: boolean
  onClose: () => void
  pasoActual?: string
}

function mensajeErrorSoporte(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return fallback
  const message = (err as { response?: { data?: { message?: unknown } } }).response?.data?.message
  return typeof message === 'string' && message ? message : fallback
}

function armarDescripcion(
  tipos: PosReporteTipoId[],
  detalle: string,
  paso: string | undefined,
  t: (key: string) => string,
): string {
  const lineas = [
    `Origen: POS`,
    paso ? `Paso: ${paso}` : null,
    `Tipos: ${tipos.map((id) => etiquetaTipoReporte(id, t)).join('; ')}`,
    detalle.trim() ? `Detalle:\n${detalle.trim()}` : null,
  ]
  return lineas.filter(Boolean).join('\n')
}

export default function PosReporteModal({ open, onClose, pasoActual }: Props) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [tipos, setTipos] = useState<PosReporteTipoId[]>([])
  const [detalle, setDetalle] = useState('')
  const [enviando, setEnviando] = useState(false)

  const puedeEnviar = tipos.length > 0 && detalle.trim().length >= 5 && !enviando

  const toggleTipo = (id: PosReporteTipoId) => {
    setTipos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const resetear = () => {
    setTipos([])
    setDetalle('')
  }

  const cerrar = () => {
    if (enviando) return
    resetear()
    onClose()
  }

  const enviar = async () => {
    if (!puedeEnviar) return
    setEnviando(true)
    try {
      const titulo = `POS: ${tipos.map((id) => etiquetaTipoReporte(id, t)).join(', ')}`.slice(0, 180)
      await soporteService.crearTicket({
        titulo,
        descripcion: armarDescripcion(tipos, detalle, pasoActual, t),
      })
      showToast(t('pos.reporte.exito'), 'success')
      resetear()
      onClose()
    } catch (err: unknown) {
      showToast(mensajeErrorSoporte(err, t('pos.reporte.errorEnvio')), 'error')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal open={open} onClose={cerrar} title={t('pos.reporte.titulo')} size="md">
      <div className="space-y-4 px-6 py-4">
        <p className="text-sm" style={{ color: posUi.muted }}>
          {t('pos.reporte.subtitulo')}
        </p>

        <fieldset className="space-y-2">
          <legend className="text-xs font-bold uppercase tracking-wide" style={{ color: posUi.muted }}>
            {t('pos.reporte.tiposLabel')}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {POS_REPORTE_TIPOS.map((id) => {
              const checked = tipos.includes(id)
              return (
                <label
                  key={id}
                  className="flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm"
                  style={{
                    borderColor: checked ? 'var(--hc-primary)' : posUi.borde,
                    backgroundColor: checked ? 'rgba(23, 71, 168, 0.08)' : posUi.panel,
                    color: posUi.texto,
                  }}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-[var(--hc-primary)]"
                    checked={checked}
                    onChange={() => toggleTipo(id)}
                  />
                  <span>{etiquetaTipoReporte(id, t)}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <label htmlFor="pos-reporte-detalle" className="text-xs font-bold uppercase tracking-wide" style={{ color: posUi.muted }}>
            {t('pos.reporte.detalleLabel')}
          </label>
          <textarea
            id="pos-reporte-detalle"
            rows={4}
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder={t('pos.reporte.detallePlaceholder')}
            className="w-full resize-y rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--hc-primary)]"
            style={{
              backgroundColor: posUi.panel,
              border: `1px solid ${posUi.borde}`,
              color: posUi.texto,
            }}
          />
          <p className="text-xs" style={{ color: posUi.muted }}>
            {t('pos.reporte.detalleAyuda')}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={cerrar}
            disabled={enviando}
            className="min-h-11 rounded-xl px-4 text-sm font-semibold"
            style={{ backgroundColor: posUi.panel, color: posUi.texto, border: `1px solid ${posUi.borde}` }}
          >
            {t('pos.reporte.cancelar')}
          </button>
          <button
            type="button"
            onClick={() => void enviar()}
            disabled={!puedeEnviar}
            className="min-h-11 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--hc-primary)' }}
          >
            {enviando ? t('pos.reporte.enviando') : t('pos.reporte.enviar')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
