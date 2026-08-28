import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import tiendaService from '@/services/tiendaService'
import { analytics } from '@/utils/analytics'
import SwipeShell from './SwipeShell'
import { IconStore, INFO_CONFIG, type InfoCardConfig } from './specialCardIcons'
import type { CartaEspecialDescubri, DirSwipeDescubri } from '@/pages/descubri/destinoDetalleDescubri'
import type { EmpresaTiendaPublica } from '@/types/tienda'

const empresaCache = new Map<string, EmpresaTiendaPublica | null>()

const ctaClass = 'inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white'
const ctaStyle = { background: 'var(--hc-accent)' }
const stopDrag = (e: React.PointerEvent) => e.stopPropagation()

type TFn = (key: string, opts?: Record<string, unknown>) => string

type SpecialCardProps = {
  card: CartaEspecialDescubri
  isTop: boolean
  stackIndex: number
  onSwipe: (dir: DirSwipeDescubri) => void
}

export default function SpecialCard({ card, isTop, stackIndex, onSwipe }: SpecialCardProps) {
  const { t } = useTranslation()
  const viewedRef = useRef(false)

  useEffect(() => {
    if (!isTop || viewedRef.current) return
    viewedRef.current = true
    if (card._tipo === 'info') analytics.descubriInfoView(card.variante ?? '')
    else analytics.descubriEmpresaView(card.slug ?? '')
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

function InfoContent({ card, t }: { card: CartaEspecialDescubri; t: TFn }) {
  const cfg = INFO_CONFIG[card.variante ?? 'about'] ?? INFO_CONFIG.about
  const Icon = cfg.icon
  return (
    <>
      <AccentGlyph>
        <Icon className="w-10 h-10" />
      </AccentGlyph>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--hc-accent)' }}>
        {t(cfg.kicker)}
      </p>
      <h2 className="text-lg font-bold leading-snug mb-2" style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}>
        {t(cfg.title)}
      </h2>
      <p className="text-sm leading-relaxed max-w-[36ch] mb-5" style={{ color: 'var(--hc-muted)' }}>
        {t(cfg.body)}
      </p>
      <InfoCta card={card} cfg={cfg} t={t} />
    </>
  )
}

function InfoCta({ card, cfg, t }: { card: CartaEspecialDescubri; cfg: InfoCardConfig; t: TFn }) {
  const { cta } = cfg
  if (!cta) return null
  const onClick = () => analytics.descubriInfoTap(card.variante ?? '', cta.id)
  const shared = { onPointerDownCapture: stopDrag, onClick, className: ctaClass, style: ctaStyle }
  if (cta.to) {
    return <Link to={cta.to} {...shared}>{t(cta.label)}</Link>
  }
  return (
    <a href={cta.href} target="_blank" rel="noopener noreferrer" {...shared}>
      {t(cta.label)}
    </a>
  )
}

function EmpresaContent({ card, stackIndex, t }: { card: CartaEspecialDescubri; stackIndex: number; t: TFn }) {
  const [info, setInfo] = useState<EmpresaTiendaPublica | null>(() => empresaCache.get(card.slug ?? '') ?? null)

  useEffect(() => {
    const slug = card.slug ?? ''
    if (stackIndex > 1 || empresaCache.has(slug)) return
    let alive = true
    tiendaService
      .getInfo(slug)
      .then((d) => {
        const infoTienda = d as EmpresaTiendaPublica
        empresaCache.set(slug, infoTienda)
        if (alive) setInfo(infoTienda)
      })
      .catch((err: unknown) => {
        console.error('[descubri] no se pudo cargar info de tienda', err)
        empresaCache.set(slug, null)
      })
    return () => { alive = false }
  }, [stackIndex, card.slug])

  const nombre = info?.nombreComercial || card.nombre

  return (
    <>
      <EmpresaLogo info={info} nombre={nombre} />
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
        onClick={() => analytics.descubriEmpresaTap(card.slug ?? '')}
        className={ctaClass}
        style={ctaStyle}
      >
        {t('descubri.empresaCta')}
      </Link>
    </>
  )
}

function EmpresaLogo({ info, nombre }: { info: EmpresaTiendaPublica | null; nombre?: string | null }) {
  if (info?.logoUrl) {
    return (
      <img
        src={info.logoUrl}
        alt={nombre ?? ''}
        className="w-20 h-20 rounded-2xl object-contain bg-white p-2 mb-5"
        style={{ border: '1px solid var(--hc-border)' }}
        draggable={false}
      />
    )
  }
  return (
    <AccentGlyph>
      <IconStore className="w-10 h-10" />
    </AccentGlyph>
  )
}

function AccentGlyph({ children }: { children: ReactNode }) {
  return (
    <div
      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
      style={{
        background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)',
        color: 'var(--hc-accent)',
      }}
    >
      {children}
    </div>
  )
}
