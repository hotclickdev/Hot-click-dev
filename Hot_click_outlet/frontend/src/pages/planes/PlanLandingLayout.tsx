import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'
import EmprendeCupoBanner from '../emprende/EmprendeCupoBanner'
import EmprendeSeccion from '../emprende/EmprendeSeccion'
import { PLAN_LANDING_COPY, type LandingPlanId } from './planLandingCopy'

const TONO_VARS: Record<string, CSSProperties> = {
  artesanal: {
    '--hc-primary': 'var(--hc-red-500)',
    '--hc-bg': '#FBF4EC',
    '--hc-surface': '#FFFFFF',
    '--hc-border': '#EAD9C2',
    '--hc-r-lg': '20px',
  } as CSSProperties,
  estandar: {} as CSSProperties,
  ejecutivo: {
    '--hc-primary': 'var(--hc-blue-600)',
    '--hc-bg': '#F5F7FB',
    '--hc-surface': '#FFFFFF',
    '--hc-border': 'var(--hc-n-200)',
    '--hc-r-lg': '10px',
  } as CSSProperties,
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function ListaPuntos({ planId }: { planId: LandingPlanId }) {
  const { t } = useTranslation()
  const puntos = t(`emprende.plan${capitalize(planId)}Puntos`, { returnObjects: true })
  if (!Array.isArray(puntos)) return null
  const textos = puntos.filter((p): p is string => typeof p === 'string')

  return (
    <ul className="flex flex-col gap-3 max-w-xl mx-auto sm:mx-0">
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

type Props = {
  planId: LandingPlanId
  mostrarCupo?: boolean
}

/** Layout compartido por las 3 landings de plan; el tono cambia solo la paleta local. */
export default function PlanLandingLayout({ planId, mostrarCupo = false }: Props) {
  const { t } = useTranslation()
  const copy = PLAN_LANDING_COPY[planId]
  const destino = `/registro-empresa?plan=${copy.query}`

  return (
    <div style={TONO_VARS[copy.tono]}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

        {/* Hero */}
        <section className="text-center sm:text-left mb-10">
          <p className="text-xs font-bold tracking-[0.14em] uppercase mb-3" style={{ color: 'var(--hc-primary)' }}>
            {copy.eyebrow}
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 leading-tight" style={{ color: 'var(--hc-text)', fontFamily: 'var(--hc-font-display)' }}>
            {copy.headline}
          </h1>
          <p className="text-base sm:text-lg mb-3 leading-relaxed max-w-2xl mx-auto sm:mx-0" style={{ color: 'var(--hc-muted)' }}>
            {copy.subheadline}
          </p>
          <p className="text-sm font-semibold mb-6" style={{ color: 'var(--hc-text)' }}>
            {copy.precio}
          </p>
          <Link
            to={destino}
            className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-semibold min-h-[48px]"
            style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
          >
            {copy.ctaLabel}
          </Link>
          {planId !== 'emprendedor' ? (
            <p className="text-xs mt-3" style={{ color: 'var(--hc-muted)' }}>
              <Link to="/para-emprendedores" style={{ color: 'var(--hc-primary)' }}>Recién arranco, sin mensualidad</Link>
            </p>
          ) : null}
          {planId !== 'plus' && planId === 'emprendedor' ? (
            <p className="text-xs mt-3" style={{ color: 'var(--hc-muted)' }}>
              Si ya tenés equipo o local, <Link to="/para-pymes" style={{ color: 'var(--hc-primary)' }}>mirá PYME</Link>
            </p>
          ) : null}
        </section>

        {mostrarCupo ? <EmprendeCupoBanner /> : null}

        {/* Para quién es / no es */}
        <EmprendeSeccion title="¿Es para vos?">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}>
              <p className="text-xs font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--hc-success, #178A50)' }}>Sí, si vos</p>
              <ul className="flex flex-col gap-2">
                {copy.paraQuienSi.map((item) => (
                  <li key={item} className="text-sm flex gap-2" style={{ color: 'var(--hc-text)' }}>
                    <TrustGlyph tipo="check" className="w-4 h-4 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}>
              <p className="text-xs font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--hc-muted)' }}>No, si vos</p>
              <ul className="flex flex-col gap-2">
                {copy.paraQuienNo.map((item) => (
                  <li key={item} className="text-sm" style={{ color: 'var(--hc-muted)' }}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </EmprendeSeccion>

        {/* Qué incluye */}
        <EmprendeSeccion
          title={t(`emprende.plan${capitalize(planId)}Title`)}
          subtitle={t(`emprende.plan${capitalize(planId)}Desc`)}
        >
          <ListaPuntos planId={planId} />
        </EmprendeSeccion>

        {/* FAQ */}
        <EmprendeSeccion title="Preguntas frecuentes">
          <div className="flex flex-col gap-4 max-w-2xl">
            {copy.faq.map(({ pregunta, respuesta }) => (
              <div key={pregunta}>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--hc-text)' }}>{pregunta}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>{respuesta}</p>
              </div>
            ))}
          </div>
        </EmprendeSeccion>

        {/* Cierre */}
        <section className="text-center py-10">
          <Link
            to={destino}
            className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-semibold min-h-[48px]"
            style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
          >
            {copy.ctaLabel}
          </Link>
        </section>

      </div>
    </div>
  )
}
