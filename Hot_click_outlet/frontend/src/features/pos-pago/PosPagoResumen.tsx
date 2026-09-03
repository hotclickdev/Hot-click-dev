import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'
import PosPagoItemFila from './PosPagoItemFila'
import { formatColones, inicialesProducto } from './posPagoFormat'
import type { QrPagoInfo } from './posPagoTypes'

export default function PosPagoResumen({ info }: { info: QrPagoInfo }) {
  const { t } = useTranslation()
  const items = info.items ?? []
  const nombre = info.empresaNombre ?? t('pos.pago.negocio')

  return (
    <article className="w-full max-w-md mx-auto">
      <header className="flex flex-col items-center text-center gap-3 pb-5">
        <MarcaEmpresa logoUrl={info.logoUrl} nombre={nombre} />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hc-border)] bg-[var(--hc-surface)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--hc-muted)]">
          <TrustGlyph tipo="lista" className="size-3.5" />
          {t('pos.pago.subtitulo')}
        </span>
        <h1 className="font-display text-[1.65rem] font-bold leading-tight tracking-tight text-[var(--hc-text)]">
          {nombre}
        </h1>
        {items.length > 0 ? (
          <p className="text-sm text-[var(--hc-muted)]">
            {t('pos.pago.nItems', { count: items.length })}
          </p>
        ) : null}
      </header>

      <div
        className="overflow-hidden rounded-[22px] border shadow-[var(--hc-shadow-2)]"
        style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-surface)' }}
      >
        <ul className="divide-y divide-[var(--hc-border)]">
          {items.map((item, idx) => (
            <PosPagoItemFila key={`${item.productoId ?? idx}-fila`} item={item} />
          ))}
        </ul>
        <div
          className="flex items-end justify-between gap-3 border-t border-dashed px-4 py-4"
          style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-surface-2)' }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--hc-muted)]">
              {t('pos.common.total')}
            </p>
            <p className="mt-0.5 text-xs text-[var(--hc-muted)]">{t('pos.pago.pagoSeguro')}</p>
          </div>
          <p className="font-display text-[1.7rem] font-bold tabular-nums leading-none text-[var(--hc-text)]">
            ₡{formatColones(info.total)}
          </p>
        </div>
      </div>
    </article>
  )
}

function MarcaEmpresa({ logoUrl, nombre }: { logoUrl?: string | null; nombre: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="size-14 rounded-2xl object-cover shadow-[var(--hc-shadow-1)]"
      />
    )
  }

  return (
    <span
      className="grid size-14 place-items-center rounded-2xl font-display text-lg font-bold shadow-[var(--hc-shadow-1)]"
      style={{ background: 'var(--hc-surface)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
      aria-hidden="true"
    >
      {inicialesProducto(nombre)}
    </span>
  )
}
