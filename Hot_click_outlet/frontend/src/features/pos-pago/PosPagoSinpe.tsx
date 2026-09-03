import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatColones } from './posPagoFormat'
import type { QrPagoInfo } from './posPagoTypes'
import PosPagoReporteModal from './PosPagoReporteModal'

type Props = {
  info: QrPagoInfo
  token?: string
}

export default function PosPagoSinpe({ info, token }: Props) {
  const { t } = useTranslation()
  const [reporteAbierto, setReporteAbierto] = useState(false)

  const filas = [
    {
      label: t('pos.qr.sinpeA'),
      value: info.sinpeNumero || t('pos.qr.configWhatsapp'),
    },
    {
      label: t('pos.qr.referencia'),
      value: info.sinpeRef ?? '—',
    },
    {
      label: t('pos.qr.montoExacto'),
      value: `₡${formatColones(info.total)}`,
    },
  ]

  return (
    <div
      className="w-full max-w-md mx-auto rounded-[22px] border p-5 space-y-3 shadow-[var(--hc-shadow-2)]"
      style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-surface)' }}
    >
      <h2 className="font-display font-bold text-[var(--hc-text)]">
        {t('pos.pago.sinpeTitulo')}
      </h2>
      <p className="text-sm text-[var(--hc-muted)]">{t('pos.pago.sinpeInstruccion')}</p>
      {filas.map((fila) => (
        <div key={fila.label} className="flex justify-between gap-3 text-sm">
          <span className="text-[var(--hc-muted)]">{fila.label}</span>
          <span className="font-semibold text-[var(--hc-text)] text-right">{fila.value}</span>
        </div>
      ))}
      <p className="text-xs text-[var(--hc-muted)] pt-1">{t('pos.pago.sinpeAvisoCajero')}</p>
      <button
        type="button"
        onClick={() => setReporteAbierto(true)}
        className="w-full rounded-[14px] border border-[var(--hc-border)] py-3 text-sm font-semibold text-[var(--hc-text)]"
        style={{ background: 'var(--hc-surface)' }}
      >
        {t('pos.pago.reportarError')}
      </button>
      <PosPagoReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        token={token}
        codigoError="sinpe"
      />
    </div>
  )
}
