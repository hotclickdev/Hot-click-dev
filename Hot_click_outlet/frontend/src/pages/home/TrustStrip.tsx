import { useTranslation } from 'react-i18next'
import { CartStepIcon, LockTrustIcon, CheckTrustIcon, TruckStepIcon } from './homeIcons'

/** Confianza bajo el hero: comprar en la web, no por chat. */
export default function TrustStrip() {
  const { t } = useTranslation()
  const items = [
    { icon: <CartStepIcon />, title: t('home.featCompraTitle'), desc: t('home.featCompraDesc') },
    { icon: <TruckStepIcon />, title: t('home.feat1Title'), desc: t('home.feat1Desc') },
    { icon: <LockTrustIcon />, title: t('home.feat2Title'), desc: t('home.feat2Desc') },
    { icon: <CheckTrustIcon />, title: t('home.feat3Title'), desc: t('home.feat3Desc') },
  ]
  return (
    <section style={{ background: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)', borderBottom: '1px solid var(--hc-border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {items.map(({ icon, title, desc }) => (
          <div key={title} className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--hc-blue-50)', color: 'var(--hc-link)' }}
              aria-hidden="true"
            >
              {icon}
            </span>
            <span>
              <span className="block text-sm font-bold leading-tight" style={{ color: 'var(--hc-text)' }}>{title}</span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{desc}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
