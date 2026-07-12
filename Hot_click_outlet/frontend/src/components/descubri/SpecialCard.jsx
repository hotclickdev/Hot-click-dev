import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import tiendaService from '@/services/tiendaService'
import { analytics } from '@/utils/analytics'
import SwipeShell from './SwipeShell'

const IconShield = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3l7 3v5c0 4.6-3 8.7-7 10-4-1.3-7-5.4-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)
const IconTruck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 7h12v9H2z" />
    <path d="M14 10h4l3 3v3h-7" />
    <circle cx="6.5" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </svg>
)
const IconLock = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
)
const IconStore = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 10l1.2-5h13.6L20 10" />
    <path d="M5 10v10h14V10" />
    <path d="M9 20v-6h6v6" />
  </svg>
)

// Config por sub-variante de tarjeta info. CTA con `to` navega interno,
// con `href` abre externo (WhatsApp).
const INFO_CONFIG = {
  about: {
    icon: IconShield,
    kicker: 'descubri.infoAboutKicker',
    title: 'descubri.infoAboutTitle',
    body: 'descubri.infoAboutBody',
    cta: { label: 'descubri.infoAboutCta', to: '/nosotros', id: 'nosotros' },
  },
  envios: {
    icon: IconTruck,
    kicker: 'descubri.infoEnviosKicker',
    title: 'descubri.infoEnviosTitle',
    body: 'descubri.infoEnviosBody',
    cta: null,
  },
  pago: {
    icon: IconLock,
    kicker: 'descubri.infoPagoKicker',
    title: 'descubri.infoPagoTitle',
    body: 'descubri.infoPagoBody',
    cta: { label: 'descubri.infoPagoCta', href: 'https://wa.me/50686667888', id: 'whatsapp' },
  },
}

// Cache de info de tiendas para no repetir el fetch entre cartas/restarts.
const empresaCache = new Map()

const ctaClass = 'inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white'
const ctaStyle = { background: 'var(--hc-accent)' }
// Evita que tocar el CTA inicie el gesto de arrastre (mismo truco del badge de SwipeCard)
const stopDrag = (e) => e.stopPropagation()

export default function SpecialCard({ card, isTop, stackIndex, onSwipe }) {
  const { t } = useTranslation()
  const viewedRef = useRef(false)

  useEffect(() => {
    if (!isTop || viewedRef.current) return
    viewedRef.current = true
    if (card._tipo === 'info') analytics.descubriInfoView(card.variante)
    else analytics.descubriEmpresaView(card.slug)
  }, [isTop, card])

  return (
    <SwipeShell isTop={isTop} stackIndex={stackIndex} onSwipe={onSwipe} stamps={null}>
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-6 py-8">
        {card._tipo === 'info'
          ? <InfoContent card={card} t={t} />
          : <EmpresaContent card={card} stackIndex={stackIndex} t={t} />}
      </div>
      <p
        className="text-center text-[11px] pb-4 px-4"
        style={{ color: 'var(--hc-muted)' }}
      >
        {t('descubri.continueHint')}
      </p>
    </SwipeShell>
  )
}

function InfoContent({ card, t }) {
  const cfg = INFO_CONFIG[card.variante] ?? INFO_CONFIG.about
  const Icon = cfg.icon
  return (
    <>
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)',
          color: 'var(--hc-accent)',
        }}
      >
        <Icon className="w-10 h-10" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--hc-accent)' }}>
        {t(cfg.kicker)}
      </p>
      <h2 className="text-lg font-bold leading-snug mb-2" style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}>
        {t(cfg.title)}
      </h2>
      <p className="text-sm leading-relaxed max-w-[36ch] mb-5" style={{ color: 'var(--hc-muted)' }}>
        {t(cfg.body)}
      </p>
      {cfg.cta && (cfg.cta.to ? (
        <Link
          to={cfg.cta.to}
          onPointerDownCapture={stopDrag}
          onClick={() => analytics.descubriInfoTap(card.variante, cfg.cta.id)}
          className={ctaClass}
          style={ctaStyle}
        >
          {t(cfg.cta.label)}
        </Link>
      ) : (
        <a
          href={cfg.cta.href}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDownCapture={stopDrag}
          onClick={() => analytics.descubriInfoTap(card.variante, cfg.cta.id)}
          className={ctaClass}
          style={ctaStyle}
        >
          {t(cfg.cta.label)}
        </a>
      ))}
    </>
  )
}

function EmpresaContent({ card, stackIndex, t }) {
  const [info, setInfo] = useState(() => empresaCache.get(card.slug) ?? null)

  // Fetch perezoso: solo cuando la carta está por ser visible (top-2 del stack).
  // El fetch enriquece (logo/tagline); la carta nunca espera por él.
  useEffect(() => {
    if (stackIndex > 1 || empresaCache.has(card.slug)) return
    let alive = true
    tiendaService
      .getInfo(card.slug)
      .then((d) => {
        empresaCache.set(card.slug, d)
        if (alive) setInfo(d)
      })
      .catch(() => empresaCache.set(card.slug, null))
    return () => { alive = false }
  }, [stackIndex, card.slug])

  const nombre = info?.nombreComercial || card.nombre

  return (
    <>
      {info?.logoUrl ? (
        <img
          src={info.logoUrl}
          alt={nombre}
          className="w-20 h-20 rounded-2xl object-contain bg-white p-2 mb-5"
          style={{ border: '1px solid var(--hc-border)' }}
          draggable={false}
        />
      ) : (
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)',
            color: 'var(--hc-accent)',
          }}
        >
          <IconStore className="w-10 h-10" />
        </div>
      )}
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--hc-accent)' }}>
        {t('descubri.empresaKicker')}
      </p>
      <h2 className="text-lg font-bold leading-snug mb-2" style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}>
        {nombre}
      </h2>
      {info?.tagline && (
        <p className="text-sm italic mb-2" style={{ color: 'var(--hc-text)' }}>
          {info.tagline}
        </p>
      )}
      <p className="text-sm leading-relaxed max-w-[36ch] mb-2" style={{ color: 'var(--hc-muted)' }}>
        {t('descubri.empresaBody', { nombre })}
      </p>
      <p className="text-xs mb-5" style={{ color: 'var(--hc-muted)' }}>
        {t('descubri.empresaHint')}
      </p>
      <Link
        to={`/tienda/${card.slug}`}
        onPointerDownCapture={stopDrag}
        onClick={() => analytics.descubriEmpresaTap(card.slug)}
        className={ctaClass}
        style={ctaStyle}
      >
        {t('descubri.empresaCta')}
      </Link>
    </>
  )
}
