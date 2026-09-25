import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'
import EmprendeCupoBanner from './EmprendeCupoBanner'
import EmprendeReveal from './EmprendeReveal'

type Puerta = {
  to: string
  badge: string
  title: string
  desc: string
}

/** Puerta corta: 3 enlaces a las landings dedicadas por plan (ver docs/ideas/landings-negocios.md). */
export default function EmprendeLanding() {
  const { t } = useTranslation()

  const puertas: Puerta[] = [
    { to: '/para-emprendedores', badge: t('emprende.planEmprendedorBadge'), title: t('emprende.planEmprendedorTitle'), desc: t('emprende.planEmprendedorDesc') },
    { to: '/para-pymes', badge: t('emprende.planPymeBadge'), title: t('emprende.planPymeTitle'), desc: t('emprende.planPymeDesc') },
    { to: '/negocio-plus-plan', badge: t('emprende.planPlusBadge'), title: t('emprende.planPlusTitle'), desc: t('emprende.planPlusDesc') },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <EmprendeReveal>
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--hc-text)', fontFamily: 'var(--hc-font-display)' }}>
            {t('emprende.metaTitle')}
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--hc-muted)' }}>
            {t('emprende.metaDescription')}
          </p>
        </div>
        <EmprendeCupoBanner />
      </EmprendeReveal>

      <EmprendeReveal>
        <div className="grid gap-4 sm:grid-cols-3">
          {puertas.map((puerta) => (
            <Link
              key={puerta.to}
              to={puerta.to}
              className="flex flex-col gap-3 rounded-2xl border p-5 transition-colors hover:border-[var(--hc-primary)]"
              style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
            >
              <p className="text-xs font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--hc-primary)' }}>
                {puerta.badge}
              </p>
              <h2 className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>{puerta.title}</h2>
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--hc-muted)' }}>{puerta.desc}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--hc-primary)' }}>
                Ver más
                <TrustGlyph tipo="adelante" className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
      </EmprendeReveal>
    </div>
  )
}
