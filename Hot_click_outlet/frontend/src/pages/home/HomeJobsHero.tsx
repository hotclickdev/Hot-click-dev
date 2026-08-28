import { useTranslation } from 'react-i18next'
import PilaresLinks from './PilaresLinks'

/** Primera pantalla: Compra · Vende · Emprende, antes del rotator de catálogo. */
export default function HomeJobsHero() {
  const { t } = useTranslation()
  return (
    <section className="px-4 sm:px-6 pt-5 sm:pt-8 pb-4 sm:pb-6" aria-labelledby="home-jobs-heading">
      <div className="max-w-7xl mx-auto text-center">
        <p
          className="text-[11px] font-bold tracking-[0.14em] uppercase mb-2"
          style={{ color: 'var(--hc-muted)', fontFamily: 'var(--hc-font-text)' }}
        >
          HotClick
        </p>
        <h1
          id="home-jobs-heading"
          className="tracking-tight"
          style={{
            color: 'var(--hc-text)',
            fontFamily: 'var(--hc-font-display)',
            fontWeight: 800,
            fontSize: 'clamp(1.45rem, 4.2vw, 2.35rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}
        >
          {t('home.jobsLine')}
        </h1>
        <p className="mt-2 mb-5 text-sm sm:text-base" style={{ color: 'var(--hc-muted)' }}>
          {t('home.jobsTag')}
        </p>
        <PilaresLinks />
      </div>
    </section>
  )
}
