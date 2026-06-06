import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { Helmet } from 'react-helmet-async'
import Seo from '@/components/seo/Seo'
import { generateWebsiteJsonLd, generateOrganizationJsonLd } from '@/utils/jsonLd'
import { productService, normalizeProduct } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import useCartStore from '@/store/cartStore'
import useRecentlyViewedStore from '@/store/recentlyViewedStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import ProductCard from '@/components/ui/ProductCard'
import { getOptimizedUrl } from '@/utils/imageUtils'
import HeroRotator from '@/components/ui/HeroRotator'

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } },
}

// Accent colors por slide (cíclicos)
const SLIDE_COLORS = [
  { accent: '#4f7cff', glow: 'rgba(79,124,255,0.28)', bg: 'rgba(79,124,255,0.07)', ring: 'rgba(79,124,255,0.35)' },
  { accent: '#a855f7', glow: 'rgba(168,85,247,0.28)', bg: 'rgba(168,85,247,0.07)', ring: 'rgba(168,85,247,0.35)' },
  { accent: '#10b981', glow: 'rgba(16,185,129,0.28)', bg: 'rgba(16,185,129,0.07)', ring: 'rgba(16,185,129,0.35)' },
  { accent: '#f59e0b', glow: 'rgba(245,158,11,0.28)', bg: 'rgba(245,158,11,0.07)', ring: 'rgba(245,158,11,0.35)' },
  { accent: '#f43f5e', glow: 'rgba(244,63,94,0.28)', bg: 'rgba(244,63,94,0.07)', ring: 'rgba(244,63,94,0.35)' },
]

const PLACEHOLDER_SLIDES = Array.from({ length: 5 }, (_, i) => ({
  id: `ph-${i}`,
  nombre: 'Tecnología premium',
  descripcion: 'Productos de calidad al mejor precio en Costa Rica.',
  precio: 0,
  imagenUrl: '',
  categoriaNombre: 'HOTCLICK',
  stock: 1,
}))

// ─── Carousel Hero ────────────────────────────────────────────────────────────
function HeroCarousel({ slides }) {
  const [current, setCurrent] = useState(0)
  const [dir, setDir] = useState(1)
  const [progress, setProgress] = useState(0)
  const intervalRef = useRef(null)
  const progressRef = useRef(null)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const DURATION = 6000

  const goTo = useCallback((idx, direction) => {
    setDir(direction ?? (idx > current ? 1 : -1))
    setCurrent(idx)
    setProgress(0)
  }, [current])

  const next = useCallback(() => goTo((current + 1) % slides.length, 1), [current, slides.length, goTo])
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length, -1), [current, slides.length, goTo])

  // Auto-advance + progress bar
  useEffect(() => {
    clearInterval(intervalRef.current)
    clearInterval(progressRef.current)
    setProgress(0)
    const step = 50
    const increment = (step / DURATION) * 100
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + increment, 100))
    }, step)
    intervalRef.current = setTimeout(() => next(), DURATION)
    return () => { clearInterval(intervalRef.current); clearInterval(progressRef.current) }
  }, [current, next])

  const slide = slides[current]
  const color = SLIDE_COLORS[current % SLIDE_COLORS.length]
  const watermark = slide.categoriaNombre || slide.nombre || 'HOTCLICK'

  const slideVariants = {
    enter: (d) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
    exit: (d) => ({ x: d > 0 ? '-40%' : '40%', opacity: 0, transition: { duration: 0.45, ease: [0.4, 0, 1, 1] } }),
  }

  const imgVariants = {
    enter: (d) => ({ x: d > 0 ? 80 : -80, opacity: 0, scale: 0.88 }),
    center: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.08 } },
    exit: { opacity: 0, scale: 0.92, transition: { duration: 0.35 } },
  }

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '82vh' }}>
      {/* Animated background glow per slide */}
      <AnimatePresence>
        <motion.div
          key={`glow-${current}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 70% 70% at 70% 50%, ${color.glow}, transparent 70%)` }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 40% 60% at 30% 30%, ${color.bg}, transparent 65%)` }} />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.35]" style={{
            backgroundImage: `linear-gradient(var(--hc-border) 1px, transparent 1px), linear-gradient(90deg, var(--hc-border) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
        </motion.div>
      </AnimatePresence>

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <AnimatePresence mode="wait">
          <motion.span
            key={`wm-${current}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.55 }}
            className="font-black uppercase tracking-[-0.02em] whitespace-nowrap leading-none"
            style={{ fontSize: '20vw', color: 'color-mix(in srgb, var(--hc-text) 4%, transparent)' }}
          >
            {watermark.split(' ')[0]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Main content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full" style={{ minHeight: 'min(60vh, 460px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-4 items-center py-5 lg:py-8">

          {/* ── Left: text content ── */}
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={`text-${current}`}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col"
            >
              {/* Category badge */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-5 w-fit"
                style={{ background: color.bg, border: `1px solid ${color.ring}`, color: color.accent }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color.accent }} />
                {slide.categoriaNombre || 'Tecnología'}
              </div>

              <h1
                className="font-black leading-[1.02] tracking-tight mb-3 line-clamp-2"
                style={{ fontSize: 'clamp(1.5rem, 3.5vw, 3rem)', color: 'var(--hc-text)' }}
              >
                {slide.nombre}
              </h1>

              {slide.descripcion && (
                <p className="text-base text-[#8e8e9a] max-w-lg mb-4 sm:mb-6 leading-relaxed line-clamp-2 sm:line-clamp-3">
                  {slide.descripcion}
                </p>
              )}

              {/* Price */}
              {slide.precio > 0 && (
                <div className="flex items-baseline gap-3 mb-4 sm:mb-6">
                  <span className="text-3xl font-black" style={{ color: color.accent }}>
                    {formatPrice(slide.precio)}
                  </span>
                  {slide.condicion && slide.condicion !== 'NUEVO' && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      slide.condicion === 'COMO_NUEVO'
                        ? 'bg-[#4f7cff]/15 border-[#4f7cff]/30 text-[#4f7cff]'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    }`}>{slide.condicion === 'COMO_NUEVO' ? 'Como nuevo' : 'Usado'}</span>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {slide.id && !String(slide.id).startsWith('ph-') ? (
                  <button
                    onClick={() => navigate(`/productos/${slide.id}`, { state: { product: slide } })}
                    className="group inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                    style={{ background: color.accent, boxShadow: `0 0 32px ${color.ring}` }}
                  >
                    Ver producto
                    <span className="inline-block group-hover:translate-x-1 transition-transform duration-200">→</span>
                  </button>
                ) : (
                  <Link
                    to="/productos"
                    className="group inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:-translate-y-0.5"
                    style={{ background: color.accent, boxShadow: `0 0 32px ${color.ring}` }}
                  >
                    {t('home.verProductos')}
                    <span className="inline-block group-hover:translate-x-1 transition-transform duration-200">→</span>
                  </Link>
                )}
                <a
                  href="#como-comprar"
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10 text-[#e8e8ed] font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5"
                >
                  {t('home.comoComprar')}
                </a>
              </div>

              {/* Mini stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="flex flex-wrap gap-4 sm:gap-5 mt-3 sm:mt-6"
              >
                {[['100%', t('home.garantia')], ['24h', t('home.envios')], ['5★', t('home.satisfaccion')]].map(([value, label]) => (
                  <div key={label}>
                    <div className="text-xl font-bold text-[#e8e8ed]">{value}</div>
                    <div className="text-sm text-[#8e8e9a] mt-0.5">{label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* ── Right: product image ── */}
          <div className="relative hidden sm:flex items-center justify-center lg:justify-end">
            {/* Ambient glow behind image */}
            <AnimatePresence>
              <motion.div
                key={`img-glow-${current}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute w-[200px] sm:w-[320px] md:w-[420px] h-[200px] sm:h-[320px] md:h-[420px] rounded-full blur-[60px] sm:blur-[80px] md:blur-[100px] pointer-events-none"
                style={{ background: color.glow }}
              />
            </AnimatePresence>

            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={`img-${current}`}
                custom={dir}
                variants={imgVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="relative z-10 flex items-center justify-center"
                style={{ width: 'min(400px, 85vw)', height: 'min(400px, 85vw)' }}
              >
                {slide.imagenUrl ? (
                  <>
                    {/* Floating animation wrapper */}
                    <motion.div
                      animate={{ y: [0, -16, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-full h-full"
                    >
                      <img
                        src={getOptimizedUrl(slide.imagenUrl, { width: 800, quality: 80 })}
                        alt={slide.nombre}
                        width={800}
                        height={800}
                        className="w-full h-full"
                        style={{ objectFit: 'contain', filter: `drop-shadow(0 0 48px ${color.glow}) drop-shadow(0 32px 48px rgba(0,0,0,0.6))` }}
                        fetchPriority={current === 0 ? 'high' : 'auto'}
                        loading={current === 0 ? 'eager' : 'lazy'}
                        decoding={current === 0 ? 'sync' : 'async'}
                      />
                    </motion.div>
                    {/* Floating badges */}
                    <motion.div
                      initial={{ opacity: 0, x: 16, y: -16 }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="absolute top-4 right-0 flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-sm"
                      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>{t('home.shipping24h')}</span>
                    </motion.div>
                    {slide.stock > 0 && slide.stock <= 3 && (
                      <motion.div
                        initial={{ opacity: 0, x: -16, y: 16 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ delay: 0.9 }}
                        className="absolute bottom-4 left-0 px-3 py-2 rounded-2xl backdrop-blur-sm"
                        style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
                      >
                        <span className="text-xs font-semibold text-amber-400">¡Últimas {slide.stock} unidades!</span>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <motion.div
                    animate={{ y: [0, -14, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <FallbackIllustration color={color.accent} />
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ── Bottom: thumbnail navigation ── */}
        <div className="pb-4 sm:pb-8 flex flex-col items-center gap-3">
          {/* Progress bar */}
          <div className="w-full max-w-xs h-0.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, background: color.accent }}
              transition={{ duration: 0 }}
            />
          </div>

          {/* Thumbnails */}
          <div className="flex items-center gap-3">
            {/* Prev arrow */}
            <button
              onClick={prev}
              aria-label={t('common.previous')}
              className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/12 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>

            <div className="flex items-center gap-2">
              {slides.map((s, i) => {
                const c = SLIDE_COLORS[i % SLIDE_COLORS.length]
                const isActive = i === current
                return (
                  <button
                    key={s.id ?? i}
                    onClick={() => goTo(i)}
                    aria-label={`Slide ${i + 1}`}
                    className="relative rounded-xl overflow-hidden transition-all duration-300 shrink-0"
                    style={{
                      width: isActive ? 72 : 48,
                      height: 48,
                      border: isActive ? `2px solid ${c.accent}` : '2px solid var(--hc-border)',
                      boxShadow: isActive ? `0 0 16px ${c.ring}` : 'none',
                      background: 'var(--hc-surface)',
                    }}
                  >
                    {s.imagenUrl ? (
                      <img
                        src={getOptimizedUrl(s.imagenUrl, { width: 96, quality: 70 })}
                        alt={s.nombre}
                        className="w-full h-full"
                        style={{ objectFit: 'contain' }}
                        loading="lazy"
                        decoding="async"
                        width={96}
                        height={48}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-lg">📦</span>
                      </div>
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: c.accent }} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Next arrow */}
            <button
              onClick={next}
              aria-label={t('common.next')}
              className="w-9 h-9 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/12 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* Slide counter */}
          <span className="text-xs text-[#8e8e9a]">{current + 1} / {slides.length}</span>
        </div>
      </div>
    </section>
  )
}

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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--hc-text)' }}>
          Explorá por categoría
        </h2>
        <Link to="/productos" className="text-xs font-semibold hover:opacity-70 transition-opacity"
          style={{ color: 'var(--hc-accent)' }}>
          Ver catálogo completo →
        </Link>
      </div>
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
                  Ver {group.products.length} producto{group.products.length !== 1 ? 's' : ''} →
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
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
  const navigate = useNavigate()
  const { t } = useTranslation()
  const featuresRef = useScrollReveal({ threshold: 0.08 })
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
        title="HOTCLICK Outlet | Ropa, Zapatos y Accesorios de Marca"
        description="Las mejores marcas a precios de outlet en Costa Rica. Envíos a todo el país."
        type="website"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(generateWebsiteJsonLd(window.location.origin))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(generateOrganizationJsonLd(window.location.origin, [
            'https://www.facebook.com/hotclickcr',
            'https://www.instagram.com/hotclickcr',
            'https://wa.me/50689745370',
            'https://www.tiktok.com/@hotclickcr',
          ]))}
        </script>
      </Helmet>
      <h1 className="sr-only">HOTCLICK — Marketplace de emprendedores en Costa Rica</h1>
      {/* ── Hero Rotador: Chat → Productos → Emprendimientos ── */}
      <HeroRotator destacados={destacados.slice(0, 3)} />

      {/* Productos destacados */}
      {destacados.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="flex items-center justify-between mb-3 sm:mb-5">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[#4f7cff]" />
              <h2 className="text-sm font-semibold tracking-wide uppercase text-[#8e8e9a]">{t('home.destacados')}</h2>
            </div>
            <Link to="/productos" className="text-xs text-[#4f7cff] hover:underline">{t('home.verTodos')}</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {destacados.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 2} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Explorar por categoría — estilo Amazon */}
      <CategoryBrowse products={productsMuestra} categories={categorias} />

      {/* Visto recientemente */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="flex items-center gap-2 mb-3 sm:mb-5">
            <span className="w-1 h-4 rounded-full bg-[#4f7cff]" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-[#8e8e9a]">{t('home.recentlyViewed')}</h2>
          </div>
          <div role="list" className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
            {recentlyViewed.map((p) => (
              <motion.article
                key={p.id}
                role="listitem"
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="shrink-0 relative w-44 rounded-2xl overflow-visible"
                style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
              >
                <Link
                  to={`/productos/${p.id}`}
                  aria-hidden="true"
                  tabIndex={-1}
                  className="absolute -top-4 -left-3 w-20 h-20 drop-shadow-xl"
                >
                  {p.imagenUrl ? (
                    <img src={getOptimizedUrl(p.imagenUrl, { width: 80, quality: 75 })} alt="" className="w-full h-full object-contain" loading="lazy" decoding="async" width={80} height={80} />
                  ) : (
                    <span aria-hidden="true" className="flex items-center justify-center w-full h-full text-3xl">📦</span>
                  )}
                </Link>
                <Link
                  to={`/productos/${p.id}`}
                  className="block pl-16 pr-3 pt-3 pb-1 rounded-t-2xl"
                  aria-label={`Ver ${p.nombre}, ${formatPrice(p.precio)}`}
                >
                  <p className="text-xs font-medium truncate max-w-[90px] leading-tight" style={{ color: 'var(--hc-muted)' }}>{p.nombre}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--hc-text)' }}>{formatPrice(p.precio)}</p>
                </Link>
                <div className="flex justify-end px-3 pb-3 pt-1">
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    aria-label={`Añadir ${p.nombre} al carrito`}
                    onClick={() => { addItem(p); toast({ message: t('product.added', { name: p.nombre }), type: 'success' }) }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-base font-bold shadow-lg"
                    style={{ background: 'var(--hc-accent)' }}
                  >+</motion.button>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      {/* Emprendimientos con convenio — marquee */}
      <ConveniosMarquee />

      {/* Marcas — clicables, llevan al catálogo filtrado */}
      {marcas.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="flex items-center justify-between mb-3 sm:mb-5">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[#4f7cff]" />
              <h2 className="text-sm font-semibold tracking-wide uppercase text-[#8e8e9a]">{t('home.brands')}</h2>
            </div>
            <Link to="/productos" className="text-xs text-[#4f7cff] hover:underline">Ver todas</Link>
          </div>
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
        </section>
      )}

      {/* How to buy section */}
      <section id="como-comprar" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-5 sm:mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4f7cff]/10 border border-[#4f7cff]/20 text-sm text-[#4f7cff] mb-4">
            {t('home.procesoBadge')}
          </div>
          <h2 className="text-3xl font-bold text-[#e8e8ed]">{t('home.comoComprarTitle')}</h2>
          <p className="text-[#8e8e9a] mt-2">{t('home.comoComprarSub')}</p>
        </motion.div>

        <div className="relative">
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[
              { step: '01', icon: <SearchStepIcon />, title: t('home.step1Title'), desc: t('home.step1Desc'), color: 'text-[#4f7cff]', glow: 'bg-[#4f7cff]/10', border: 'border-[#4f7cff]/20' },
              { step: '02', icon: <CartStepIcon />, title: t('home.step2Title'), desc: t('home.step2Desc'), color: 'text-purple-400', glow: 'bg-purple-500/10', border: 'border-purple-500/20' },
              { step: '03', icon: <WhatsStepIcon />, title: t('home.step3Title'), desc: t('home.step3Desc'), color: 'text-[#25D366]', glow: 'bg-[#25D366]/10', border: 'border-[#25D366]/20' },
              { step: '04', icon: <TruckStepIcon />, title: t('home.step4Title'), desc: t('home.step4Desc'), color: 'text-amber-400', glow: 'bg-amber-500/10', border: 'border-amber-500/20' },
            ].map(({ step, icon, title, desc, color, glow, border }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="hc-step-card relative flex flex-col items-center text-center p-4 sm:p-6 rounded-2xl bg-[#111114] border border-white/8"
              >
                <div className={`hc-step-icon w-11 h-11 sm:w-14 sm:h-14 rounded-2xl ${glow} border ${border} flex items-center justify-center mb-3 sm:mb-4 ${color}`}>
                  {icon}
                </div>
                <span className={`text-[10px] font-bold tracking-widest ${color} mb-2`}>{step}</span>
                <h3 className="font-semibold text-[#e8e8ed] mb-2">{title}</h3>
                <p className="text-xs text-[#8e8e9a] leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="border-t" style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}>
        <div ref={featuresRef} className="hc-reveal max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            {[
              { icon: '🚚', title: t('home.feat1Title'), desc: t('home.feat1Desc') },
              { icon: '🔒', title: t('home.feat2Title'), desc: t('home.feat2Desc') },
              { icon: '✓', title: t('home.feat3Title'), desc: t('home.feat3Desc') },
            ].map(({ icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="hc-glass-card flex items-start gap-3 p-4 sm:p-6"
              >
                <span className="text-3xl shrink-0">{icon}</span>
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--hc-text)' }}>{title}</h3>
                  <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
                  transition={{ delay: 0.20 }}
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
                      transition={{ delay: 0.18 + i * 0.10, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
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

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden p-7 sm:p-12"
          style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20"
              style={{ background: 'radial-gradient(ellipse at center, var(--hc-accent), transparent 70%)' }} />
            <div className="absolute bottom-0 right-0 w-64 h-64 opacity-10"
              style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }} />
          </div>
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--hc-text)' }}>
              {t('home.ctaTitle')}
            </h2>
            <p className="mb-5 sm:mb-8 max-w-md mx-auto" style={{ color: 'var(--hc-muted)' }}>
              {t('home.ctaSub')}
            </p>
            <Link to="/productos" className="hc-btn hc-btn-primary hc-btn-lg inline-flex">
              {t('home.ctaBtn')}
            </Link>
          </div>
        </motion.div>
      </section>
    </MainLayout>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: 'Andrés M.', location: 'San José', rating: 5, text: 'Compré unos audífonos y llegaron en perfectas condiciones. El trato por WhatsApp fue muy rápido y claro. 100% recomendado.' },
  { name: 'Valeria R.', location: 'Heredia', rating: 5, text: 'Encontré una laptop como nueva a un precio increíble. El proceso fue sencillo: elegí, mandé el WhatsApp y en 2 días la tenía en casa.' },
  { name: 'Carlos B.', location: 'Cartago', rating: 5, text: 'Excelente servicio. Me explicaron todo sobre la condición del producto antes de comprar. Llegó exactamente como lo describieron.' },
  { name: 'Sofía L.', location: 'Alajuela', rating: 5, text: 'Precios muy accesibles y productos de buena calidad. Ya es mi segunda compra y sigo igual de satisfecha con HOTCLICK.' },
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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-5 sm:mb-8">
        <h2 className="text-2xl font-bold text-[#e8e8ed]">{t('home.testimoniosTitle')}</h2>
        <p className="text-sm text-[#8e8e9a] mt-1">{t('home.testimoniosSub')}</p>
      </motion.div>
      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 overflow-hidden">
          {visible.map((t, i) => (
            <motion.div key={idx + i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.08 }} className="hc-glass-card p-4 sm:p-6 flex flex-col gap-3">
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
          <button onClick={prev} aria-label={t('common.previous')} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="flex gap-1.5">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === idx ? 'bg-[#4f7cff] w-4' : 'bg-white/20'}`} />
            ))}
          </div>
          <button onClick={next} aria-label={t('common.next')} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── Step icons ───────────────────────────────────────────────────────────────
const si = 'w-6 h-6'
const ss = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

function SearchStepIcon() { return <svg className={si} viewBox="0 0 24 24" {...ss}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function CartStepIcon() { return <svg className={si} viewBox="0 0 24 24" {...ss}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg> }
function WhatsStepIcon() { return <svg className={si} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> }
function TruckStepIcon() { return <svg className={si} viewBox="0 0 24 24" {...ss}><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> }

function FallbackIllustration({ color }) {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 0 32px ${color}55)` }}>
      <path d="M40 110 C40 60 160 60 160 110" stroke={color} strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.9"/>
      <rect x="20" y="108" width="36" height="48" rx="18" fill="#1a1a2e" stroke={color} strokeWidth="3" opacity="0.95"/>
      <rect x="28" y="116" width="20" height="32" rx="10" fill={color} opacity="0.18"/>
      <rect x="28" y="116" width="20" height="32" rx="10" stroke={color} strokeWidth="1.5" opacity="0.5"/>
      <rect x="144" y="108" width="36" height="48" rx="18" fill="#1a1a2e" stroke={color} strokeWidth="3" opacity="0.95"/>
      <rect x="152" y="116" width="20" height="32" rx="10" fill={color} opacity="0.18"/>
      <rect x="152" y="116" width="20" height="32" rx="10" stroke={color} strokeWidth="1.5" opacity="0.5"/>
      <path d="M60 78 C80 65 120 65 140 78" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.15"/>
      <circle cx="38" cy="132" r="3" fill={color} opacity="0.7"/>
      <circle cx="162" cy="132" r="3" fill={color} opacity="0.7"/>
    </svg>
  )
}

