import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { Helmet } from 'react-helmet-async'
import Seo from '@/components/seo/Seo'
import { generateWebsiteJsonLd, generateOrganizationJsonLd, generateFAQJsonLd, generateItemListJsonLd } from '@/utils/jsonLd'
import { productService } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import useCartStore from '@/store/cartStore'
import useRecentlyViewedStore from '@/store/recentlyViewedStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'
import ProductCard from '@/components/ui/ProductCard'
import { getOptimizedUrl } from '@/utils/imageUtils'
import HeroRotator from '@/components/ui/HeroRotator'
import Section, { SectionHeader } from '@/components/ui/Section'

/* Franja de confianza bajo el hero (patrón Mercurio × Brand Book §15.1):
   los diferenciadores reales del negocio, con icono azul — el color guía, no decora. */
function TrustStrip() {
  const { t } = useTranslation()
  const items = [
    { icon: <ChatTrustIcon />, title: 'Estamos disponibles', desc: 'Escribinos por WhatsApp', href: 'https://wa.me/50686667888' },
    { icon: <TruckStepIcon />, title: t('home.feat1Title'), desc: t('home.feat1Desc') },
    { icon: <LockTrustIcon />, title: t('home.feat2Title'), desc: t('home.feat2Desc') },
    { icon: <CheckTrustIcon />, title: t('home.feat3Title'), desc: t('home.feat3Desc') },
  ]
  return (
    <section style={{ background: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)', borderBottom: '1px solid var(--hc-border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {items.map(({ icon, title, desc, href }) => {
          const Tag = href ? 'a' : 'div'
          return (
            <Tag
              key={title}
              {...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="flex items-center gap-3"
            >
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
            </Tag>
          )
        })}
      </div>
    </section>
  )
}

function ChatTrustIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> }
function LockTrustIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> }
function CheckTrustIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> }

// ─── Marquee de emprendimientos con convenio ──────────────────────────────────
function ConveniosMarquee() {
  const [items, setItems] = useState([])

  useEffect(() => {
    import('@/services/api').then(({ default: api }) => {
      api.get('/convenios/publicos')
        .then(r => setItems(r.data?.data ?? []))
        .catch(() => {})
    })
  }, [])

  if (items.length === 0) return null

  const repeated = [...items, ...items, ...items]

  return (
    <section style={{ padding: '20px 0', overflow: 'hidden', borderTop: '1px solid var(--hc-border)', borderBottom: '1px solid var(--hc-border)', background: 'var(--hc-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, paddingLeft: 24 }}>
        <span style={{ width: 4, height: 16, borderRadius: 2, background: 'var(--hc-accent)', display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-muted)' }}>
          Emprendimientos con convenio
        </span>
      </div>
      <div style={{ display: 'flex', gap: 0, width: '100%', overflow: 'hidden' }}>
        <motion.div
          animate={{ x: ['0%', '-33.33%'] }}
          transition={{ duration: items.length * 4, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'flex', gap: 32, paddingLeft: 24, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          {repeated.map((c, i) => (
            <div key={`${c.id}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {c.logoUrl && (
                <img src={c.logoUrl} alt={c.nombre} style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 4 }} />
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--hc-text-2)' }}>{c.nombre}</span>
              <span style={{ fontSize: 10, color: 'var(--hc-border-strong)', marginLeft: 8 }}>✦</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ─── Sección "Explorar por categoría" estilo Amazon ──────────────────────────
function CategoryBrowse({ products, categories }) {
  // Agrupar productos por categoría y tomar las 8 categorías con más productos
  const catGroups = useMemo(() => {
    const map = {}
    products.forEach(p => {
      const catId = String(p.categoriaId ?? '')
      if (!catId) return
      if (!map[catId]) map[catId] = { products: [], catId }
      map[catId].products.push(p)
    })
    // Enriquecer con nombre de categoría
    return Object.values(map)
      .map(g => {
        const cat = categories.find(c => String(c.id ?? c.idCategoria) === g.catId)
        return { ...g, nombre: cat?.nombreCategoria ?? cat?.nombre ?? 'Sin nombre' }
      })
      .filter(g => g.products.length >= 1)
      .sort((a, b) => b.products.length - a.products.length)
      .slice(0, 8)
  }, [products, categories])

  if (catGroups.length === 0) return null

  return (
    <Section
      title="Elegí una categoría."
      subtitle="Hay mucho por explorar."
      action={{ label: 'Ver catálogo completo', to: '/productos' }}
      tone="surface"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {catGroups.map((group, gi) => (
          <motion.div
            key={group.catId}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: gi * 0.06 }}
          >
            <Link
              to={`/productos?cat=${group.catId}`}
              className="block rounded-2xl overflow-hidden transition-all hover:shadow-lg group"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              {/* Título */}
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-sm font-bold line-clamp-1 group-hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--hc-text)' }}>
                  {group.nombre}
                </h3>
              </div>

              {/* Grid 2×2 de imágenes de productos */}
              <div className="grid grid-cols-2 gap-px p-2 pt-1">
                {Array.from({ length: 4 }).map((_, i) => {
                  const prod = group.products[i]
                  return (
                    <div key={i} className="aspect-square overflow-hidden rounded-xl"
                      style={{ background: 'color-mix(in srgb, var(--hc-text) 4%, transparent)' }}>
                      {prod?.imagenUrl ? (
                        <img
                          src={prod.imagenUrl}
                          alt={prod.nombre ?? ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">
                          📦
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-3">
                <span className="text-xs font-semibold transition-opacity group-hover:opacity-60"
                  style={{ color: 'var(--hc-accent)' }}>
                  Ver {group.products.length} producto{group.products.length === 1 ? '' : 's'} →
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}

// ─── Sección de envío ────────────────────────────────────────────────────────
const si2 = 'w-5 h-5'
const ss2 = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }

function IconRayo() { return <svg className={si2} viewBox="0 0 24 24" {...ss2}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> }
function IconPaquete() { return <svg className={si2} viewBox="0 0 24 24" {...ss2}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> }
function IconPin() { return <svg className={si2} viewBox="0 0 24 24" {...ss2}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> }
function IconCamion() { return <svg className={si2} viewBox="0 0 24 24" {...ss2}><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> }
function IconAvion() { return <svg className={si2} viewBox="0 0 24 24" {...ss2}><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2v0A1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg> }

function IconSinpe() { return <svg className="w-4 h-4" viewBox="0 0 24 24" {...ss2}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5"/><line x1="9" y1="6" x2="15" y2="6"/></svg> }
function IconEfectivo() { return <svg className="w-4 h-4" viewBox="0 0 24 24" {...ss2}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg> }
function IconTarjeta() { return <svg className="w-4 h-4" viewBox="0 0 24 24" {...ss2}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> }

const ENVIO_OPTS = [
  {
    Icon: IconRayo,
    title: 'Envío Rápido',
    time: '30 min – 2 horas',
    desc: 'Dentro de la GAM · Pago previo requerido',
    price: '₡5,000',
    accent: '#f59e0b',
    accentBg: 'rgba(245,158,11,0.10)',
    accentBorder: 'rgba(245,158,11,0.25)',
  },
  {
    Icon: IconPaquete,
    title: 'Envío Normal — GAM',
    time: '2–4 días hábiles',
    desc: 'Con número de rastreo incluido',
    price: '₡4,000',
    accent: 'var(--hc-accent)',
    accentBg: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
    accentBorder: 'color-mix(in srgb, var(--hc-accent) 28%, transparent)',
  },
  {
    Icon: IconPin,
    title: 'Fuera de la GAM',
    time: '3–4 días hábiles',
    desc: 'Con número de rastreo incluido',
    price: '₡4,000',
    accent: '#6366f1',
    accentBg: 'rgba(99,102,241,0.10)',
    accentBorder: 'rgba(99,102,241,0.28)',
  },
  {
    Icon: IconCamion,
    title: 'Tu encomienda',
    time: 'Según tu mensajero',
    desc: 'Te entregamos en el punto de tu preferencia',
    price: '₡2,500',
    accent: '#10b981',
    accentBg: 'rgba(16,185,129,0.09)',
    accentBorder: 'rgba(16,185,129,0.24)',
  },
  {
    Icon: IconAvion,
    title: 'Internacional',
    time: 'A coordinar',
    desc: 'Realizamos envíos fuera de Costa Rica',
    price: 'Consultar',
    accent: '#8b5cf6',
    accentBg: 'rgba(139,92,246,0.10)',
    accentBorder: 'rgba(139,92,246,0.28)',
    whatsapp: true,
  },
]

const PAGO_OPTS = [
  { label: 'SINPE Móvil', Icon: IconSinpe, color: '#10b981' },
  { label: 'Efectivo', Icon: IconEfectivo, color: '#f59e0b' },
  { label: 'Tarjeta', Icon: IconTarjeta, color: 'var(--hc-muted)', soon: true },
]

function ShippingSection() {
  const [active, setActive] = useState(0)
  const opt = ENVIO_OPTS[active]

  return (
    <section style={{ borderTop: '1px solid var(--hc-border)', borderBottom: '1px solid var(--hc-border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase mb-2" style={{ color: 'var(--hc-accent)' }}>
              Logística HotClick
            </p>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight" style={{ color: 'var(--hc-text)', letterSpacing: '-0.02em' }}>
              Enviamos a todo el país.
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Elegí la opción que mejor se adapte a vos.</p>
          </div>
          {/* Métodos de pago */}
          <div className="flex items-center gap-2">
            {PAGO_OPTS.map(p => (
              <div
                key={p.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{
                  background: p.soon ? 'transparent' : `color-mix(in srgb, ${p.color} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${p.color} ${p.soon ? '20%' : '30%'}, transparent)`,
                  color: p.soon ? 'var(--hc-muted)' : p.color,
                  opacity: p.soon ? 0.55 : 1,
                }}
              >
                <p.Icon />
                <span>{p.label}</span>
                {p.soon && <span className="text-[9px] font-bold opacity-70">pronto</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Cards desktop grid + tab selector mobile */}
        <div className="hidden sm:grid grid-cols-5 gap-3">
          {ENVIO_OPTS.map((o, i) => (
            <motion.div
              key={o.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.07 }}
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: 'var(--hc-surface)', border: `1px solid ${o.accentBorder}` }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: o.accentBg, border: `1px solid ${o.accentBorder}`, color: o.accent }}
              >
                <o.Icon />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm leading-snug" style={{ color: 'var(--hc-text)' }}>{o.title}</p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: o.accent }}>{o.time}</p>
                <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--hc-muted)' }}>{o.desc}</p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: `1px solid ${o.accentBorder}` }}>
                <span className="text-sm font-black" style={{ color: o.accent }}>{o.price}</span>
                {o.whatsapp && (
                  <a
                    href="https://wa.me/50686667888?text=Hola%20HotClick%2C%20quiero%20info%20de%20env%C3%ADo%20internacional"
                    target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.25)' }}
                  >
                    WhatsApp →
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile: tabs + panel */}
        <div className="sm:hidden">
          {/* Tab pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {ENVIO_OPTS.map((o, i) => (
              <button
                key={o.title}
                onClick={() => setActive(i)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={active === i
                  ? { background: o.accentBg, border: `1.5px solid ${o.accentBorder}`, color: o.accent }
                  : { background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}
              >
                <o.Icon />
                <span className="whitespace-nowrap">{o.title}</span>
              </button>
            ))}
          </div>

          {/* Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-4 rounded-2xl p-5 flex gap-4"
              style={{ background: 'var(--hc-surface)', border: `1px solid ${opt.accentBorder}` }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: opt.accentBg, border: `1px solid ${opt.accentBorder}`, color: opt.accent }}
              >
                <opt.Icon />
              </div>
              <div className="flex-1">
                <p className="font-bold" style={{ color: 'var(--hc-text)' }}>{opt.title}</p>
                <p className="text-sm font-semibold" style={{ color: opt.accent }}>{opt.time}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{opt.desc}</p>
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${opt.accentBorder}` }}>
                  <span className="text-lg font-black" style={{ color: opt.accent }}>{opt.price}</span>
                  {opt.whatsapp ? (
                    <a
                      href="https://wa.me/50686667888?text=Hola%20HotClick%2C%20quiero%20info%20de%20env%C3%ADo%20internacional"
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.25)' }}
                    >
                      Consultar por WhatsApp →
                    </a>
                  ) : (
                    <a href="/checkout" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'var(--hc-accent)', color: '#fff' }}>
                      Comprar ahora →
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer strip — envío rápido call to action */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-6 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ background: 'color-mix(in srgb, #f59e0b 6%, transparent)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}>
              <IconRayo />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-300">¿Necesitás algo urgente?</p>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Envío rápido disponible — llegás a tu puerta en 30 min a 2 horas dentro de la GAM</p>
            </div>
          </div>
          <a
            href="https://wa.me/50686667888?text=Hola%20HotClick%2C%20quiero%20hacer%20un%20pedido%20con%20env%C3%ADo%20r%C3%A1pido"
            target="_blank" rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#25D366', color: '#fff' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            Pedir envío rápido
          </a>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function HomePage() {
  const [destacados, setDestacados] = useState([])
  const [marcas, setMarcas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [productsMuestra, setProductsMuestra] = useState([])
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()
  const { t } = useTranslation()
  const recentlyViewed = useRecentlyViewedStore((s) => s.items)

  useEffect(() => {
    productService.getDestacados()
      .then(({ data }) => setDestacados(Array.isArray(data) ? data.slice(0, 8) : []))
      .catch(() => {})
    marcaService.getPublicas()
      .then(({ data }) => setMarcas(Array.isArray(data) ? data : []))
      .catch(() => {})
    productService.getCategories()
      .then(({ data }) => setCategorias(Array.isArray(data) ? data : []))
      .catch(() => {})
    // Muestra amplia para el grid por categorías
    productService.getAll(0, 60)
      .then(({ data }) => {
        const content = data.content ?? data ?? []
        setProductsMuestra(Array.isArray(content) ? content.map(p => ({
          id: p.id ?? p.idProducto,
          categoriaId: p.categoriaId ?? p.idCategoria ?? p.categoria?.id,
          imagenUrl: p.imagenPrincipalUrl ?? p.imagenUrl ?? p.imagen,
          nombre: p.nombreProducto ?? p.nombre ?? p.titulo,
        })) : [])
      })
      .catch(() => {})
  }, [])

  return (
    <MainLayout>
      <Seo
        title="HotClick — Marketplace de emprendedores en Costa Rica"
        description="Marketplace de emprendedores costarricenses. Productos únicos con envío a todo Costa Rica, pagos seguros y soporte local."
        type="website"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(generateWebsiteJsonLd(globalThis.location.origin))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(generateOrganizationJsonLd(globalThis.location.origin, [
            'https://www.facebook.com/hotclickcr',
            'https://www.instagram.com/hotclickcr',
            'https://wa.me/50686667888',
            'https://www.tiktok.com/@hotclickcr',
          ]))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(generateFAQJsonLd())}
        </script>
        {destacados.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify(generateItemListJsonLd(destacados, globalThis.location.origin))}
          </script>
        )}
      </Helmet>
      <h1 className="sr-only">HotClick — Marketplace de emprendedores en Costa Rica</h1>
      {/* ── Hero: rotador con chat conversacional → Productos → Emprendimientos ── */}
      <HeroRotator destacados={destacados.slice(0, 3)} />

      {/* Franja de confianza — diferenciadores reales con icono azul (§15.1) */}
      <TrustStrip />

      {/* Productos destacados */}
      {destacados.length > 0 && (
        <Section
          title={`${t('home.destacados')}.`}
          subtitle="Esto te va a gustar."
          action={{ label: t('home.verTodos'), to: '/productos' }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {destacados.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 2} index={i} />
            ))}
          </div>
        </Section>
      )}

      {/* Explorar por categoría — estilo Amazon */}
      <CategoryBrowse products={productsMuestra} categories={categorias} />

      {/* Visto recientemente */}
      {recentlyViewed.length > 0 && (
        <Section title={`${t('home.recentlyViewed')}.`} subtitle="Seguí donde lo dejaste.">
          <div role="list" className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide px-1">
            {recentlyViewed.map((p) => (
              <motion.article
                key={p.id}
                role="listitem"
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="shrink-0 w-36 rounded-2xl overflow-hidden flex flex-col"
                style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
              >
                <Link
                  to={`/productos/${p.id}`}
                  aria-hidden="true"
                  tabIndex={-1}
                  className="block w-full h-28 bg-gray-50 flex items-center justify-center overflow-hidden"
                  style={{ background: 'var(--hc-bg)' }}
                >
                  {p.imagenUrl ? (
                    <img
                      src={getOptimizedUrl(p.imagenUrl, { width: 160, quality: 80 })}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      width={144}
                      height={112}
                    />
                  ) : (
                    <span aria-hidden="true" className="text-4xl">📦</span>
                  )}
                </Link>
                <div className="flex flex-col flex-1 px-3 pt-2 pb-3 gap-1">
                  <Link
                    to={`/productos/${p.id}`}
                    aria-label={`Ver ${p.nombre}, ${formatPrice(p.precio)}`}
                    className="flex-1"
                  >
                    <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: 'var(--hc-muted)' }}>{p.nombre}</p>
                    <p className="text-sm font-bold mt-1" style={{ color: 'var(--hc-text)' }}>{formatPrice(p.precio)}</p>
                  </Link>
                  <div className="flex justify-end mt-1">
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      aria-label={`Añadir ${p.nombre} al carrito`}
                      onClick={() => { addItem(p); toast({ message: t('product.added', { name: p.nombre }), type: 'success' }) }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-base font-bold shadow"
                      style={{ background: 'var(--hc-accent)' }}
                    >+</motion.button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </Section>
      )}

      {/* Emprendimientos con convenio — marquee */}
      <ConveniosMarquee />

      {/* Marcas — sección siempre renderizada para evitar CLS al cargar */}
      <section style={{ minHeight: '130px' }}>
        {marcas.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <SectionHeader
              title={`${t('home.brands')}.`}
              subtitle="Confianza que se reconoce."
              action={{ label: 'Ver todas', to: '/productos' }}
            />
            <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
              {marcas.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35 }}
                  whileHover={{ y: -3 }}
                >
                  <Link
                    to={`/productos?marcas=${m.id}`}
                    className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl border transition-all group"
                    style={{ background: 'var(--hc-surface)', borderColor: 'var(--hc-border)', minWidth: '90px' }}
                  >
                    <div className="w-14 h-14 rounded-xl border flex items-center justify-center overflow-hidden transition-colors"
                      style={{ background: 'color-mix(in srgb, var(--hc-text) 4%, transparent)', borderColor: 'var(--hc-border)' }}>
                      {m.logoUrl ? (
                        <img
                          src={getOptimizedUrl(m.logoUrl, { width: 56, quality: 80 })}
                          alt={m.nombreMarca}
                          className="w-full h-full object-contain p-1.5"
                          loading="lazy" decoding="async" width={56} height={56}
                        />
                      ) : (
                        <span className="text-2xl" style={{ opacity: 0.4 }}>🏷</span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-center leading-tight group-hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--hc-text)' }}>
                      {m.nombreMarca}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Opciones de envío y pago */}
      <ShippingSection />

      {/* Cómo comprar — franja de pasos sobre azul 50 (§15.5) */}
      <Section
        id="como-comprar"
        title={`${t('home.comoComprarTitle')}.`}
        subtitle={t('home.comoComprarSub')}
        tone="blue50"
      >
        <div className="relative">
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--hc-blue-200), transparent)' }} />
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[
              { step: '01', icon: <SearchStepIcon />, title: t('home.step1Title'), desc: t('home.step1Desc'), accent: 'var(--hc-link)' },
              { step: '02', icon: <CartStepIcon />, title: t('home.step2Title'), desc: t('home.step2Desc'), accent: 'var(--hc-link)' },
              { step: '03', icon: <WhatsStepIcon />, title: t('home.step3Title'), desc: t('home.step3Desc'), accent: '#25D366' },
              { step: '04', icon: <TruckStepIcon />, title: t('home.step4Title'), desc: t('home.step4Desc'), accent: 'var(--hc-success)' },
            ].map(({ step, icon, title, desc, accent }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="hc-step-card relative flex flex-col items-center text-center p-4 sm:p-6 rounded-2xl"
                style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
              >
                <div
                  className="hc-step-icon w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3 sm:mb-4"
                  style={{ color: accent, background: `color-mix(in srgb, ${accent} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)` }}
                >
                  {icon}
                </div>
                <span className="text-[10px] font-bold tracking-widest mb-2" style={{ color: accent }}>{step}</span>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--hc-text)' }}>{title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Testimonials */}
      <TestimonialsCarousel />

      {/* Servicios Hot promo */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl overflow-hidden"
          style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
        >
          {/* Background layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 opacity-[0.035]" style={{
              backgroundImage: `repeating-linear-gradient(-45deg, var(--hc-text) 0px, var(--hc-text) 1px, transparent 1px, transparent 14px)`,
            }} />
            <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.22), transparent 65%)', filter: 'blur(48px)' }} />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full"
              style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--hc-accent) 25%, transparent), transparent 65%)', filter: 'blur(40px)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px]"
              style={{ background: 'radial-gradient(ellipse, color-mix(in srgb, var(--hc-accent) 4%, transparent), transparent 70%)' }} />
          </div>

          <div className="relative p-6 sm:p-10 lg:p-14">
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-20 items-center">

              {/* ── Left: copy + CTA ── */}
              <div className="flex-1 max-w-md text-center lg:text-left">
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.08 }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-5"
                  style={{ backgroundColor: 'rgba(245,158,11,0.11)', border: '1px solid rgba(245,158,11,0.28)', color: '#b45309' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />
                  {t('serviciosPage.newService')}
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.14 }}
                  className="font-black leading-[1.04] tracking-tight mb-4"
                  style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', color: 'var(--hc-text)' }}
                >
                  {t('serviciosPage.title')}
                </motion.h2>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-base leading-relaxed mb-1.5" style={{ color: 'var(--hc-muted)' }}>
                    {t('home.servicesNotFound')}{' '}
                    <strong style={{ color: 'var(--hc-text)', fontWeight: 700 }}>{t('home.servicesSend')}</strong>
                  </p>
                  <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--hc-muted)' }}>
                    {t('home.servicesSearch')}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.27 }}
                  className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
                >
                  <Link to="/servicios" className="hc-btn hc-btn-primary hc-btn-lg inline-flex items-center gap-2 group">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    {t('home.servicesRequest')}
                    <span className="inline-block group-hover:translate-x-1 transition-transform duration-200">→</span>
                  </Link>
                </motion.div>
              </div>

              {/* ── Right: vertical step list ── */}
              <div className="w-full lg:w-auto lg:shrink-0 relative">
                {/* Connecting line */}
                <div className="absolute left-[1.875rem] top-10 bottom-10 w-px hidden sm:block"
                  style={{ background: 'linear-gradient(to bottom, rgba(245,158,11,0.5), color-mix(in srgb, var(--hc-accent) 60%, transparent), rgba(16,185,129,0.4))' }} />

                <div className="flex flex-col gap-3 sm:gap-4">
                  {([
                    {
                      n: '01', icon: '📷',
                      label: t('home.servicesStep1'),
                      desc: 'Mandanos la foto del producto por WhatsApp',
                      accent: '#f59e0b',
                      accentBg: 'rgba(245,158,11,0.10)',
                      accentBorder: 'rgba(245,158,11,0.25)',
                    },
                    {
                      n: '02', icon: '🔍',
                      label: t('home.servicesStep2'),
                      desc: 'Consultamos todos nuestros proveedores',
                      accent: 'var(--hc-accent)',
                      accentBg: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
                      accentBorder: 'color-mix(in srgb, var(--hc-accent) 28%, transparent)',
                    },
                    {
                      n: '03', icon: '💬',
                      label: t('home.servicesStep3'),
                      desc: 'Precio y disponibilidad en minutos',
                      accent: '#10b981',
                      accentBg: 'rgba(16,185,129,0.09)',
                      accentBorder: 'rgba(16,185,129,0.24)',
                    },
                  ]).map((s, i) => (
                    <motion.div
                      key={s.n}
                      initial={{ opacity: 0, x: 28 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.18 + i * 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      className="flex items-center gap-4 p-4 rounded-2xl relative z-10"
                      style={{
                        background: 'var(--hc-surface-2)',
                        border: '1px solid var(--hc-border)',
                        minWidth: 'clamp(240px, 40vw, 300px)',
                        cursor: 'default',
                      }}
                    >
                      <div className="w-[3.75rem] h-[3.75rem] rounded-xl flex flex-col items-center justify-center shrink-0 gap-0.5"
                        style={{ background: s.accentBg, border: `1px solid ${s.accentBorder}` }}>
                        <span className="text-xl leading-none">{s.icon}</span>
                        <span className="text-[9px] font-black tracking-widest" style={{ color: s.accent }}>{s.n}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold leading-snug" style={{ color: 'var(--hc-text)' }}>{s.label}</span>
                        <span className="text-xs leading-snug" style={{ color: 'var(--hc-muted)' }}>{s.desc}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA — banner de campaña sobre azul 900 (§5.3: el rojo solo en el CTA) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl overflow-hidden p-7 sm:p-12"
          style={{ background: 'var(--hc-blue-900)' }}
        >
          <p className="text-[11px] font-bold tracking-[0.14em] uppercase mb-3" style={{ color: 'var(--hc-blue-300)', fontFamily: 'var(--font-mono)' }}>
            HotClick · Costa Rica
          </p>
          <h2
            className="text-3xl sm:text-4xl mb-4"
            style={{ color: '#FFFFFF', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            {t('home.ctaTitle')}
          </h2>
          <p className="mb-6 sm:mb-8 max-w-md mx-auto" style={{ color: 'var(--hc-blue-200)' }}>
            {t('home.ctaSub')}
          </p>
          <Link to="/productos" className="hc-btn hc-btn-primary hc-btn-lg inline-flex">
            {t('home.ctaBtn')}
          </Link>
        </motion.div>
      </section>
      {/* Sección SEO — contenido indexable para Google (visible en pantallas pequeñas como texto de apoyo) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 border-t" style={{ borderColor: 'var(--hc-border)' }} aria-label="Sobre HotClick">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--hc-accent)' }}>Marketplace costarricense</h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
              HotClick conecta emprendedores y compradores de todo Costa Rica. Encontrá tecnología, ropa, accesorios, artículos del hogar y más, con envío a todo el país.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--hc-accent)' }}>Pagos seguros</h2>
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--hc-muted)' }}>
              Manejamos tarjetas de crédito y débito, además de SINPE Móvil. Todos los pagos se procesan con encriptación SSL. Compra con total confianza.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {/* VISA */}
              <div className="flex items-center justify-center px-2.5 py-1 rounded-md" style={{ background: '#1a1f71', border: '1px solid rgba(255,255,255,0.1)' }}>
                <svg viewBox="0 0 50 16" width="34" height="11" fill="none">
                  <text x="0" y="13" fontSize="14" fontWeight="900" fontFamily="'Arial Black', sans-serif" fill="white" letterSpacing="-0.5">VISA</text>
                </svg>
              </div>
              {/* Mastercard */}
              <div className="flex items-center justify-center px-2 py-1 rounded-md" style={{ background: '#252525', border: '1px solid rgba(255,255,255,0.1)' }}>
                <svg viewBox="0 0 38 24" width="34" height="18" fill="none">
                  <circle cx="14" cy="12" r="10" fill="#EB001B" />
                  <circle cx="24" cy="12" r="10" fill="#F79E1B" />
                  <path d="M19 4.8a10 10 0 0 1 0 14.4A10 10 0 0 1 19 4.8z" fill="#FF5F00" />
                </svg>
              </div>
              {/* SINPE Móvil */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: '#003d1f', border: '1px solid rgba(52,211,153,0.3)' }}>
                <svg viewBox="0 0 10 14" width="7" height="10" fill="none">
                  <rect x="1" y="0" width="8" height="14" rx="1.5" stroke="#34d399" strokeWidth="1.2" />
                  <rect x="3" y="2" width="4" height="1" rx="0.5" fill="#34d399" />
                  <circle cx="5" cy="11" r="1" fill="#34d399" />
                </svg>
                <span style={{ fontSize: 8, fontWeight: 800, color: '#34d399', letterSpacing: '0.03em', fontFamily: 'sans-serif' }}>SINPE</span>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--hc-accent)' }}>Envío a todo Costa Rica</h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
              Enviamos a San José, Alajuela, Heredia, Cartago, Puntarenas, Limón y Guanacaste en 1–5 días hábiles. Envío express disponible.
            </p>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: 'Andrés M.', location: 'San José', rating: 5, text: 'Compré unos audífonos y llegaron en perfectas condiciones. El trato por WhatsApp fue muy rápido y claro. 100% recomendado.' },
  { name: 'Valeria R.', location: 'Heredia', rating: 5, text: 'Encontré una laptop como nueva a un precio increíble. El proceso fue sencillo: elegí, mandé el WhatsApp y en 2 días la tenía en casa.' },
  { name: 'Carlos B.', location: 'Cartago', rating: 5, text: 'Excelente servicio. Me explicaron todo sobre la condición del producto antes de comprar. Llegó exactamente como lo describieron.' },
  { name: 'Sofía L.', location: 'Alajuela', rating: 5, text: 'Precios muy accesibles y productos de buena calidad. Ya es mi segunda compra y sigo igual de satisfecha con HotClick.' },
  { name: 'Diego P.', location: 'Liberia', rating: 5, text: 'Me sorprendió lo rápido que respondieron. En menos de 10 minutos ya tenía confirmado el pedido. El envío llegó sin problemas al Correos.' },
]

function TestimonialsCarousel() {
  const [idx, setIdx] = useState(0)
  const { t } = useTranslation()
  const prev = () => setIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
  const next = () => setIdx((i) => (i + 1) % TESTIMONIALS.length)
  const visible = [
    TESTIMONIALS[idx % TESTIMONIALS.length],
    TESTIMONIALS[(idx + 1) % TESTIMONIALS.length],
    TESTIMONIALS[(idx + 2) % TESTIMONIALS.length],
  ]

  return (
    <Section title={`${t('home.testimoniosTitle')}.`} subtitle={t('home.testimoniosSub')} tone="surface">
      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 overflow-hidden">
          {visible.map((t, i) => (
            <motion.div key={idx + i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.08 }} className="hc-card p-4 sm:p-6 flex flex-col gap-3">
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, s) => (
                  <svg key={s} className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--hc-muted)' }}>"{t.text}"</p>
              <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--hc-border)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 15%, transparent)', color: 'var(--hc-accent)' }}>
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>{t.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>{t.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-6">
          <button onClick={prev} aria-label={t('common.previous')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="flex gap-1.5">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} aria-label={`Ver testimonio ${i + 1}`} className="p-2.5 flex items-center justify-center" style={{ background: 'transparent', border: 'none' }}>
                <span className="block rounded-full transition-all" style={{
                  width: i === idx ? 16 : 10,
                  height: 10,
                  backgroundColor: i === idx ? 'var(--hc-accent)' : 'var(--hc-border-strong)',
                }} />
              </button>
            ))}
          </div>
          <button onClick={next} aria-label={t('common.next')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </Section>
  )
}

// ─── Step icons ───────────────────────────────────────────────────────────────
const si = 'w-6 h-6'
const ss = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

function SearchStepIcon() { return <svg className={si} viewBox="0 0 24 24" {...ss}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function CartStepIcon() { return <svg className={si} viewBox="0 0 24 24" {...ss}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg> }
function WhatsStepIcon() { return <svg className={si} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> }
function TruckStepIcon() { return <svg className={si} viewBox="0 0 24 24" {...ss}><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> }


