import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PLAN_LANDING_COPY } from '../planes/planLandingCopy'

const copy = PLAN_LANDING_COPY.plus
const destino = `/registro-empresa?plan=${copy.query}`

/** CTA de cierre de la landing. */
export default function NegocioPlusCtaFinal() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <h2 className="text-2xl sm:text-3xl font-bold max-w-xl" style={{ color: 'var(--hc-text)' }}>
        {t('negocioPlus.ctaFinalTitle')}
      </h2>
      <Link
        to={destino}
        className="inline-flex items-center justify-center px-7 py-3.5 rounded-lg text-sm font-semibold min-h-[44px] text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
        style={{ backgroundColor: 'var(--hc-blue-600)' }}
      >
        {t('negocioPlus.heroCta')}
      </Link>
    </div>
  )
}
