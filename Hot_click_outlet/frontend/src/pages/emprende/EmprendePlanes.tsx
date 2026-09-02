import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'
import EmprendeSeccion from './EmprendeSeccion'

type PlanLanding = {
  id: string
  anchor?: string
  destacado?: boolean
}

const PLANES: PlanLanding[] = [
  { id: 'emprendedor' },
  { id: 'pyme', anchor: 'pyme' },
  { id: 'plus', anchor: 'negocio-plus', destacado: true },
]

function ListaPuntos({ planId }: { planId: string }) {
  const { t } = useTranslation()
  const puntos = t(`emprende.plan${capitalize(planId)}Puntos`, { returnObjects: true })
  if (!Array.isArray(puntos)) return null
  const textos = puntos.filter((punto): punto is string => typeof punto === 'string')

  return (
    <ul className="flex flex-col gap-2 flex-1">
      {textos.map((punto) => (
        <li key={punto} className="flex gap-2 text-sm" style={{ color: 'var(--hc-text)' }}>
          <span className="shrink-0 mt-0.5" style={{ color: 'var(--hc-success, #22c55e)' }}>
            <TrustGlyph tipo="check" className="w-4 h-4" />
          </span>
          {punto}
        </li>
      ))}
    </ul>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Planes Emprendedor, PYME y Negocio Plus — sin precios. */
export default function EmprendePlanes() {
  const { t } = useTranslation()

  return (
    <EmprendeSeccion
      title={t('emprende.planesTitle')}
      subtitle={t('emprende.planesSub')}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANES.map((plan) => (
          <TarjetaPlan key={plan.id} plan={plan} />
        ))}
      </div>
    </EmprendeSeccion>
  )
}

function TarjetaPlan({ plan }: { plan: PlanLanding }) {
  const { t } = useTranslation()
  const prefix = `plan${capitalize(plan.id)}`
  const cta = plan.id === 'emprendedor' ? t('emprende.ctaCrear') : t(`emprende.${plan.id}Cta`)

  return (
    <article
      id={plan.anchor}
      className={`flex flex-col gap-4 rounded-2xl border p-5 sm:p-6 scroll-mt-24 ${plan.destacado ? 'lg:-mt-1 lg:mb-1' : ''}`}
      style={{
        borderColor: plan.destacado ? 'var(--hc-primary)' : 'var(--hc-border)',
        backgroundColor: 'var(--hc-surface)',
        boxShadow: plan.destacado ? '0 0 0 1px var(--hc-primary)' : undefined,
      }}
    >
      <div>
        <p className="text-xs font-bold tracking-[0.12em] uppercase mb-1" style={{ color: 'var(--hc-primary)' }}>
          {t(`emprende.${prefix}Badge`)}
        </p>
        <h3 className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>
          {t(`emprende.${prefix}Title`)}
        </h3>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          {t(`emprende.${prefix}Desc`)}
        </p>
      </div>
      <ListaPuntos planId={plan.id} />
      <Link
        to="/registro-empresa"
        className="inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold min-h-[44px] mt-auto"
        style={
          plan.destacado
            ? { backgroundColor: 'var(--hc-primary)', color: '#fff' }
            : { backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }
        }
      >
        {cta}
      </Link>
    </article>
  )
}
