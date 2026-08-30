import { useTranslation } from 'react-i18next'

function VisaBadge() {
  return (
    <div className="flex items-center justify-center px-2.5 py-1 rounded-md" style={{ background: '#1a1f71', border: '1px solid rgba(255,255,255,0.1)' }}>
      <svg viewBox="0 0 50 16" width="34" height="11" fill="none">
        <text x="0" y="13" fontSize="14" fontWeight="900" fontFamily="'Arial Black', sans-serif" fill="white" letterSpacing="-0.5">VISA</text>
      </svg>
    </div>
  )
}

function MastercardBadge() {
  return (
    <div className="flex items-center justify-center px-2 py-1 rounded-md" style={{ background: '#252525', border: '1px solid rgba(255,255,255,0.1)' }}>
      <svg viewBox="0 0 38 24" width="34" height="18" fill="none">
        <circle cx="14" cy="12" r="10" fill="#EB001B" />
        <circle cx="24" cy="12" r="10" fill="#F79E1B" />
        <path d="M19 4.8a10 10 0 0 1 0 14.4A10 10 0 0 1 19 4.8z" fill="#FF5F00" />
      </svg>
    </div>
  )
}

function SinpeBadge() {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: '#003d1f', border: '1px solid rgba(52,211,153,0.3)' }}>
      <svg viewBox="0 0 10 14" width="7" height="10" fill="none">
        <rect x="1" y="0" width="8" height="14" rx="1.5" stroke="#34d399" strokeWidth="1.2" />
        <rect x="3" y="2" width="4" height="1" rx="0.5" fill="#34d399" />
        <circle cx="5" cy="11" r="1" fill="#34d399" />
      </svg>
      <span style={{ fontSize: 8, fontWeight: 800, color: '#34d399', letterSpacing: '0.03em', fontFamily: 'sans-serif' }}>SINPE</span>
    </div>
  )
}

/** Bloque SEO indexable al pie de la home. */
export default function SobreHotClick() {
  const { t } = useTranslation()
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 border-t" style={{ borderColor: 'var(--hc-border)' }} aria-label={t('home.aboutAria')}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--hc-accent)' }}>{t('home.aboutMarketplaceTitle')}</h2>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
            {t('home.aboutMarketplaceBody')}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--hc-accent)' }}>{t('home.aboutPaymentsTitle')}</h2>
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--hc-muted)' }}>
            {t('home.aboutPaymentsBody')}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <VisaBadge />
            <MastercardBadge />
            <SinpeBadge />
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--hc-accent)' }}>{t('home.aboutShippingTitle')}</h2>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
            {t('home.aboutShippingBody')}
          </p>
        </div>
      </div>
    </section>
  )
}
