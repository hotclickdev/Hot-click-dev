import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const HREF_WA_CONSULTA = 'https://wa.me/50686667888'

/** Cierre de /informacion: comprar primero; WhatsApp es consulta. */
export default function InformacionCta() {
  const { t } = useTranslation()
  return (
    <section className="text-center" aria-labelledby="informacion-cierre">
      <div
        className="relative rounded-3xl p-10 overflow-hidden"
        style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
      >
        <h2 id="informacion-cierre" className="text-2xl font-bold mb-3" style={{ color: 'var(--hc-text)' }}>
          {t('informacion.ctaTitle')}
        </h2>
        <p className="mb-6 max-w-sm mx-auto text-sm" style={{ color: 'var(--hc-muted)' }}>
          {t('informacion.ctaSub')}
        </p>
        <Link to="/productos" className="hc-btn hc-btn-primary min-h-11">
          {t('informacion.ctaBtn')}
        </Link>
        <a
          href={HREF_WA_CONSULTA}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('informacion.ctaWaAria')}
          className="flex items-center justify-center min-h-11 text-sm font-medium mt-1"
          style={{ color: 'var(--hc-muted)' }}
        >
          {t('informacion.ctaWa')}
        </a>
      </div>
    </section>
  )
}
