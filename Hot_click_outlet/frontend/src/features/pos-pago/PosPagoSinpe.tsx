import { useTranslation } from 'react-i18next'
import { formatColones } from './posPagoFormat'
import type { QrPagoInfo } from './posPagoTypes'

export default function PosPagoSinpe({ info }: { info: QrPagoInfo }) {
  const { t } = useTranslation()

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
      className="w-full max-w-md mx-auto rounded-2xl border p-4 space-y-3"
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
    </div>
  )
}
