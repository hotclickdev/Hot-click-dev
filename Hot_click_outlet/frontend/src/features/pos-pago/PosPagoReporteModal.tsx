import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import { urlWhatsApp } from '@/pages/carrito/cartHelpers'
import {
  POS_REPORTE_TIPOS,
  etiquetaTipoReporte,
  type PosReporteTipoId,
} from './posReporteTipos'

type Props = {
  open: boolean
  onClose: () => void
  token?: string
  codigoError?: string | null
}

function armarMensajeWhatsApp(
  tipos: PosReporteTipoId[],
  detalle: string,
  token: string | undefined,
  codigoError: string | null | undefined,
  t: (key: string) => string,
): string {
  const lineas = [
    'Reporte pago POS (cliente)',
    token ? `Token: ${token}` : null,
    codigoError ? `Código UI: ${codigoError}` : null,
    `Tipos: ${tipos.map((id) => etiquetaTipoReporte(id, t)).join('; ')}`,
    detalle.trim() ? `Detalle:\n${detalle.trim()}` : null,
  ]
  return lineas.filter(Boolean).join('\n')
}

export default function PosPagoReporteModal({ open, onClose, token, codigoError }: Props) {
  const { t } = useTranslation()
  const [tipos, setTipos] = useState<PosReporteTipoId[]>([])
  const [detalle, setDetalle] = useState('')

  const puedeEnviar = tipos.length > 0 && detalle.trim().length >= 5

  const toggleTipo = (id: PosReporteTipoId) => {
    setTipos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const resetear = () => {
    setTipos([])
    setDetalle('')
  }

  const cerrar = () => {
    resetear()
    onClose()
  }

  const enviarWhatsApp = () => {
    if (!puedeEnviar) return
    const texto = armarMensajeWhatsApp(tipos, detalle, token, codigoError, t)
    const href = urlWhatsApp(encodeURIComponent(texto))
    resetear()
    onClose()
    globalThis.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <Modal open={open} onClose={cerrar} title={t('pos.reporte.tituloCliente')} size="md">
      <div className="space-y-4 px-6 py-4">
        <p className="text-sm text-[var(--hc-muted)]">{t('pos.reporte.subtituloCliente')}</p>

        <fieldset className="space-y-2">
          <legend className="text-xs font-bold uppercase tracking-wide text-[var(--hc-muted)]">
            {t('pos.reporte.tiposLabel')}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {POS_REPORTE_TIPOS.map((id) => {
              const checked = tipos.includes(id)
              return (
                <label
                  key={id}
                  className="flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm text-[var(--hc-text)]"
                  style={{
                    borderColor: checked ? 'var(--hc-primary)' : 'var(--hc-border)',
                    backgroundColor: checked ? 'rgba(23, 71, 168, 0.08)' : 'var(--hc-surface)',
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
          <label htmlFor="pos-pago-reporte-detalle" className="text-xs font-bold uppercase tracking-wide text-[var(--hc-muted)]">
            {t('pos.reporte.detalleLabel')}
          </label>
          <textarea
            id="pos-pago-reporte-detalle"
            rows={4}
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder={t('pos.reporte.detallePlaceholderCliente')}
            className="w-full resize-y rounded-xl border border-[var(--hc-border)] bg-[var(--hc-surface)] px-3 py-2.5 text-sm text-[var(--hc-text)] outline-none focus:ring-2 focus:ring-[var(--hc-primary)]"
          />
          <p className="text-xs text-[var(--hc-muted)]">{t('pos.reporte.detalleAyuda')}</p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={cerrar}
            className="min-h-11 rounded-xl border border-[var(--hc-border)] bg-[var(--hc-surface)] px-4 text-sm font-semibold text-[var(--hc-text)]"
          >
            {t('pos.reporte.cancelar')}
          </button>
          <button
            type="button"
            onClick={enviarWhatsApp}
            disabled={!puedeEnviar}
            className="min-h-11 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--hc-primary)' }}
          >
            {t('pos.reporte.enviarWhatsApp')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
