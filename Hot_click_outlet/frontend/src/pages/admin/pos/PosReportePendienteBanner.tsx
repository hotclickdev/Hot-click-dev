import { useTranslation } from 'react-i18next'
import { posUi } from './posApariencia'

type Props = {
  mensaje?: string
  onReportar: () => void
}

/** Banner bajo el header tras un toast de error de caja. */
export default function PosReportePendienteBanner({ mensaje, onReportar }: Props) {
  const { t } = useTranslation()

  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4"
      style={{
        backgroundColor: 'var(--hc-danger-bg)',
        borderBottom: '1px solid var(--hc-danger)',
        color: 'var(--hc-danger)',
      }}
      role="status"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t('pos.reporte.bannerTitulo')}</p>
        {mensaje ? (
          <p className="truncate text-xs font-medium" style={{ color: posUi.texto }}>
            {mensaje}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onReportar}
        className="min-h-9 shrink-0 rounded-lg px-3 text-xs font-bold text-white"
        style={{ backgroundColor: 'var(--hc-danger)' }}
        aria-label={t('pos.reporte.botonAria')}
      >
        {t('pos.reporte.bannerCta')}
      </button>
    </div>
  )
}
