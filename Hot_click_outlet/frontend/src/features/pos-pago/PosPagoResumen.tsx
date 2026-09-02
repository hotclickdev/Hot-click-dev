import { useTranslation } from 'react-i18next'
import { formatColones, nombreItem } from './posPagoFormat'
import type { QrPagoInfo } from './posPagoTypes'

export default function PosPagoResumen({ info }: { info: QrPagoInfo }) {
  const { t } = useTranslation()
  const items = info.items ?? []

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <header className="text-center space-y-1">
        {info.logoUrl ? (
          <img
            src={info.logoUrl}
            alt=""
            className="h-12 w-12 rounded-xl mx-auto object-cover"
          />
        ) : null}
        <p className="text-xs uppercase tracking-wide text-[var(--hc-muted)]">
          {t('pos.pago.subtitulo')}
        </p>
        <h1 className="font-display text-xl font-bold text-[var(--hc-text)]">
          {info.empresaNombre ?? t('pos.pago.negocio')}
        </h1>
      </header>

      <ul
        className="rounded-2xl border divide-y overflow-hidden"
        style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-surface)' }}
      >
        {items.map((item, idx) => {
          const cantidad = Math.max(1, item.cantidad ?? 1)
          const linea = (item.precioUnitario ?? 0) * cantidad
          return (
            <li
              key={`${item.productoId ?? idx}-${nombreItem(item)}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-[var(--hc-text)] truncate">{nombreItem(item)}</p>
                <p className="text-xs text-[var(--hc-muted)]">
                  {cantidad} × ₡{formatColones(item.precioUnitario)}
                </p>
              </div>
              <span className="font-semibold text-[var(--hc-text)] shrink-0">
                ₡{formatColones(linea)}
              </span>
            </li>
          )
        })}
      </ul>

      <div
        className="flex items-center justify-between rounded-2xl px-4 py-3 font-bold text-lg"
        style={{ background: 'var(--hc-surface-2)' }}
      >
        <span className="text-[var(--hc-muted)]">{t('pos.common.total')}</span>
        <span className="text-[var(--hc-text)]">₡{formatColones(info.total)}</span>
      </div>
    </div>
  )
}
