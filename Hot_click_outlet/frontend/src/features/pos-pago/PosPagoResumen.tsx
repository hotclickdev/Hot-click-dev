import { useTranslation } from 'react-i18next'
import PosPagoItemFila from './PosPagoItemFila'
import { formatColones, inicialesProducto } from './posPagoFormat'
import type { QrPagoInfo } from './posPagoTypes'

export default function PosPagoResumen({ info }: { info: QrPagoInfo }) {
  const { t } = useTranslation()
  const items = info.items ?? []
  const nombre = info.empresaNombre ?? t('pos.pago.negocio')

  return (
    <article
      className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border"
      style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-surface)', boxShadow: 'var(--hc-shadow-1)' }}
    >
      <header className="flex items-center gap-3 px-5 pt-5 pb-4">
        <MarcaEmpresa logoUrl={info.logoUrl} nombre={nombre} />
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--hc-muted)]">
            {t('pos.pago.subtitulo')}
          </p>
          <h1 className="truncate font-display text-lg font-bold leading-tight tracking-tight text-[var(--hc-text)]">
            {nombre}
          </h1>
        </div>
      </header>

      <div className="px-5 pb-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--hc-muted)]">
          {t('pos.pago.totalAPagar')}
        </p>
        <p className="mt-1 font-display text-[2.5rem] font-bold tabular-nums leading-none text-[var(--hc-text)]">
          ₡{formatColones(info.total)}
        </p>
        {items.length > 0 ? (
          <p className="mt-2 text-sm text-[var(--hc-muted)]">
            {t('pos.pago.nItems', { count: items.length })}
          </p>
        ) : null}
      </div>

      {items.length > 0 ? (
        <ul className="divide-y divide-[var(--hc-border)] border-t border-[var(--hc-border)]">
          {items.map((item, idx) => (
            <PosPagoItemFila key={`${item.productoId ?? idx}-fila`} item={item} />
          ))}
        </ul>
      ) : null}
    </article>
  )
}

function MarcaEmpresa({ logoUrl, nombre }: { logoUrl?: string | null; nombre: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="size-11 shrink-0 rounded-xl object-cover"
      />
    )
  }

  return (
    <span
      className="grid size-11 shrink-0 place-items-center rounded-xl font-display text-sm font-bold"
      style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
      aria-hidden="true"
    >
      {inicialesProducto(nombre)}
    </span>
  )
}
