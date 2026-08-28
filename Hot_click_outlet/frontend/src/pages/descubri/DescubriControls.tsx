import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IconHeart, IconUndo, IconX } from './descubriIcons'
import type { DirSwipeDescubri } from './destinoDetalleDescubri'

/** Botones de deshacer, skip, like y detalle. */
export default function DescubriControls({
  canUndo,
  onUndo,
  onSwipe,
  detailTo,
}: {
  canUndo: boolean
  onUndo: () => void
  onSwipe: (dir: DirSwipeDescubri) => void
  detailTo: string
}) {
  const { t } = useTranslation()
  return (
    <>
      {/* pr en móvil: deja libre la esquina de los botones flotantes (carrito/WhatsApp) */}
      <div className="flex items-center justify-center gap-4 sm:gap-5 mt-5 pr-12 sm:pr-0">
        <button type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t('descubri.undo')}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
          style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
        >
          <IconUndo className="w-4.5 h-4.5" />
        </button>
        <button type="button"
          onClick={() => onSwipe('skip')}
          aria-label={t('descubri.skip')}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90"
          style={{ background: 'var(--hc-surface)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 14px var(--hc-shadow)' }}
        >
          <IconX className="w-6 h-6" />
        </button>
        <button type="button"
          onClick={() => onSwipe('like')}
          aria-label={t('descubri.like')}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform active:scale-90"
          style={{ background: 'var(--hc-danger)', boxShadow: '0 4px 14px var(--hc-shadow)' }}
        >
          <IconHeart className="w-6 h-6" />
        </button>
        <Link
          to={detailTo}
          aria-label={t('descubri.detail')}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4.5 h-4.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v4h1" />
          </svg>
        </Link>
      </div>

      <p className="text-center text-[11px] mt-4" style={{ color: 'var(--hc-muted)' }}>
        {t('descubri.learnHint')}
      </p>
      <p className="hidden sm:block text-center text-[11px] mt-1" style={{ color: 'var(--hc-muted)' }}>
        {t('descubri.keyboardHint')}
      </p>
    </>
  )
}
