import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IconHeart } from './descubriIcons'
import type { DescubriDeckApi } from './destinoDetalleDescubri'

/** Encabezado del mazo: título, progreso y atajo a wishlist. */
export default function DescubriHeader({ deck }: { deck: DescubriDeckApi }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}>
          {t('descubri.title')}
        </h1>
        {deck.status === 'ready' && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {t('descubri.progress', { seen: deck.seen + 1, total: deck.total })}
          </p>
        )}
      </div>
      <Link
        to="/wishlist"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
        style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
      >
        <IconHeart className="w-3.5 h-3.5" style={{ color: 'var(--hc-danger)' }} />
        {deck.liked.length}
      </Link>
    </div>
  )
}
