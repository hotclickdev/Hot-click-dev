import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TextoFlecha from '@/components/ui/TextoFlecha'
import { HotClickMark } from '@/components/ui/BrandLogo'
import useRutaPanel from '@/app/useRutaPanel'
import type { PosStep, PosTurno } from './posHelpers'
import { posUi } from './posApariencia'
import PosReporteModal from './PosReporteModal'

/**
 * Chrome utilitario de la caja. El título “Caja (POS)” vive en StepVenta (Figma 71:128).
 */
export default function POSHeader({ userName, turno, step, mostrarVolverSistema }: {
  userName?: string | null
  turno: PosTurno | null
  step: PosStep | string
  mostrarVolverSistema?: boolean
}) {
  const { t } = useTranslation()
  const rutaPanel = useRutaPanel()
  const [reporteAbierto, setReporteAbierto] = useState(false)
  const enVenta = step === 'venta'
  const labels: Record<string, string> = {
    apertura: t('pos.header.stepApertura'),
    cobro: t('pos.header.stepCobro'),
    qr: t('pos.header.stepQr'),
    recibo: t('pos.header.stepRecibo'),
  }
  const chipSec = { backgroundColor: posUi.panel, color: posUi.muted, border: `1px solid ${posUi.borde}` }

  return (
    <div
      className="flex shrink-0 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5"
      style={{ backgroundColor: posUi.barra, borderBottom: `1.5px solid ${posUi.borde}` }}
    >
      <div className="mr-1 flex items-center gap-2">
        <HotClickMark size={24} className="shrink-0" />
        {!enVenta && labels[step] ? (
          <span className="hidden text-sm font-bold sm:block" style={{ color: posUi.texto }}>
            {labels[step]}
          </span>
        ) : (
          <span className="hidden text-sm font-bold tracking-wider sm:block" style={{ color: posUi.texto }}>
            {t('pos.common.pos')}
          </span>
        )}
      </div>

      {mostrarVolverSistema ? (
        <Link
          to={rutaPanel}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all hover:bg-[var(--hc-surface-2)]"
          style={chipSec}
        >
          <TextoFlecha dir="atras">{t('pos.header.panel')}</TextoFlecha>
        </Link>
      ) : null}

      {turno ? (
        <div
          className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1 sm:flex"
          style={{ backgroundColor: 'rgba(23,138,80,0.08)', border: '1px solid rgba(23,138,80,0.2)' }}
        >
          <span className="size-1.5 animate-pulse rounded-full bg-[var(--hc-success)]" />
          <span className="text-xs font-bold" style={{ color: 'var(--hc-success)' }}>{t('pos.common.turnoActivo')}</span>
        </div>
      ) : null}

      <div className="flex-1" />

      <Link
        to="/admin/pos/historial"
        className="hidden rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all hover:bg-[var(--hc-surface-2)] sm:block"
        style={chipSec}
      >
        {t('pos.header.historial')}
      </Link>

      <button
        type="button"
        onClick={() => setReporteAbierto(true)}
        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all hover:bg-[var(--hc-surface-2)]"
        style={chipSec}
        aria-label={t('pos.reporte.botonAria')}
      >
        {t('pos.header.reportar')}
      </button>

      <div className="flex items-center gap-2 pl-2" style={{ borderLeft: `1px solid ${posUi.borde}` }}>
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
        >
          {userName?.[0]?.toUpperCase() ?? 'C'}
        </div>
        <span className="hidden text-xs lg:block" style={{ color: posUi.muted }}>{userName}</span>
      </div>

      <PosReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        pasoActual={String(step)}
      />
    </div>
  )
}
