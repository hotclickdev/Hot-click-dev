import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/* Banner de entrada a Descubrí: mini-mazo de tarjetas como motivo visual */
export default function DescubriBanner() {
  const { t } = useTranslation()
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
      <Link
        to="/descubri"
        className="group flex items-center gap-4 sm:gap-6 rounded-2xl px-5 py-4 sm:px-8 sm:py-5 transition-colors"
        style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
      >
        {/* Mini-mazo ilustrativo */}
        <div className="relative w-12 h-14 sm:w-14 sm:h-16 shrink-0" aria-hidden="true">
          <div className="absolute inset-0 rounded-lg -rotate-6 transition-transform group-hover:-rotate-12" style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }} />
          <div className="absolute inset-0 rounded-lg rotate-3 transition-transform group-hover:rotate-6" style={{ background: 'var(--hc-surface-3, var(--hc-surface-2))', border: '1px solid var(--hc-border)' }} />
          <div className="absolute inset-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--hc-accent)' }}>
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base sm:text-lg leading-tight" style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}>
            {t('descubri.bannerTitle')}
          </h2>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {t('descubri.bannerSub')}
          </p>
        </div>

        <span
          className="shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white transition-transform group-hover:scale-105"
          style={{ background: 'var(--hc-accent)' }}
        >
          {t('descubri.bannerCta')}
        </span>
      </Link>
    </section>
  )
}
