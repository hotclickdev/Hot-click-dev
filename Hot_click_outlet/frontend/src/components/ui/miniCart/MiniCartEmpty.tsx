import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function MiniCartEmpty() {
  const { t } = useTranslation()

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1" style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)' }}>
        <svg className="w-8 h-8" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 001.95 1.61h9.72a2 2 0 001.95-1.61L23 6H6" />
        </svg>
      </div>
      <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>{t('miniCart.empty')}</p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
        {t('miniCart.emptySub')}
      </p>
      <Link
        to="/productos"
        className="hc-btn hc-btn-primary hc-btn-sm mt-2"
      >
        {t('miniCart.explore')}
      </Link>
    </div>
  )
}
