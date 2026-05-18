import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { productService, normalizeProduct } from '@/services/productService'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } },
}

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const heroRef = useRef(null)
  const featuredRef = useScrollReveal()
  const featuresRef = useScrollReveal({ threshold: 0.08 })
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const rightY = useTransform(scrollYProgress, [0, 1], [0, -80])
  const rightRotate = useTransform(scrollYProgress, [0, 1], [0, 12])

  useEffect(() => {
    productService.getDestacados()
      .then(({ data }) => {
        const items = Array.isArray(data) ? data : data?.content ?? []
        if (items.length > 0) {
          setProducts(items.slice(0, 4))
          setLoading(false)
        } else {
          return productService.getAll(0, 4).then(({ data: d }) => {
            const fallback = (d.content ?? d ?? [])
            setProducts(fallback.slice(0, 4))
            setLoading(false)
          })
        }
      })
      .catch(() => {
        productService.getAll(0, 4)
          .then(({ data }) => setProducts((data.content ?? data ?? []).slice(0, 4)))
          .catch(() => {})
          .finally(() => setLoading(false))
      })
  }, [])

  const handleAdd = (product) => {
    addItem(product)
    toast({ message: t('product.added', { name: product.nombre }), type: 'success' })
  }

  return (
    <MainLayout>
      {/* Hero — split layout */}
      <section ref={heroRef} className="relative min-h-[88vh] flex items-center overflow-hidden">
        {/* Bg glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[700px] h-[700px] bg-[#4f7cff]/7 rounded-full blur-[130px]" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#4f7cff]/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/3 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px]" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
          <span
            className="font-black uppercase tracking-[-0.02em] whitespace-nowrap leading-none"
            style={{ fontSize: '18vw', color: 'rgba(255,255,255,0.018)' }}
          >
            OUTLET
          </span>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-6 items-center">

            {/* ── Left: text ── */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4f7cff]/10 border border-[#4f7cff]/20 text-sm text-[#4f7cff] mb-6"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#4f7cff] animate-pulse" />
                {t('home.badge')}
              </motion.div>

              <h1 className="text-5xl sm:text-6xl lg:text-[4.5rem] font-black text-[#e8e8ed] leading-[1.05] tracking-tight mb-6">
                {t('home.hero1')}{' '}
                <span className="text-gradient-accent inline-block">{t('home.hero2')}</span>{' '}
                {t('home.hero3')}
              </h1>

              <p className="text-lg sm:text-xl text-[#8e8e9a] max-w-lg mb-10 leading-relaxed">
                {t('home.heroSub')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/productos"
                  className="group inline-flex items-center justify-center gap-2.5 h-14 px-8 rounded-2xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-bold text-base transition-all duration-200 shadow-[0_0_32px_rgba(79,124,255,0.4)] hover:shadow-[0_0_56px_rgba(79,124,255,0.6)] hover:-translate-y-0.5 active:translate-y-0"
                >
                  {t('home.verProductos')}
                  <span className="inline-block group-hover:translate-x-1 transition-transform duration-200">→</span>
                </Link>
                <a
                  href="#como-comprar"
                  className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white/6 hover:bg-white/10 border border-white/10 text-[#e8e8ed] font-semibold text-base transition-all duration-200 hover:-translate-y-0.5"
                >
                  {t('home.comoComprar')}
                </a>
              </div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="flex flex-wrap gap-8 mt-10"
              >
                {[
                  ['100%', t('home.garantia')],
                  ['24h', t('home.envios')],
                  ['5★', t('home.satisfaccion')],
                ].map(([value, label]) => (
                  <div key={label}>
                    <div className="text-2xl font-bold text-[#e8e8ed]">{value}</div>
                    <div className="text-sm text-[#8e8e9a] mt-0.5">{label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* ── Right: product illustration ── */}
            <div className="relative flex items-center justify-center lg:justify-end">
              {/* Ambient glows */}
              <div className="absolute w-[380px] h-[380px] bg-[#4f7cff]/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute w-[200px] h-[200px] bg-purple-500/8 rounded-full blur-[60px] translate-x-16 translate-y-10 pointer-events-none" />

              {/* Main illustration — parallax + float */}
              <motion.div
                style={{ y: rightY, rotate: rightRotate }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 pointer-events-none select-none"
              >
                <motion.div
                  animate={{ y: [0, -14, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative w-60 h-60 sm:w-80 sm:h-80"
                >
                  <div className="absolute inset-0 bg-[#4f7cff]/12 rounded-full blur-3xl scale-110" />
                  <HeadphonesIllustration />
                </motion.div>
              </motion.div>

              {/* Floating badge — shipping */}
              <motion.div
                initial={{ opacity: 0, x: 16, y: -16 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="absolute top-6 right-2 sm:right-6 flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-sm"
                style={{ background: 'rgba(17,17,20,0.88)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-[#e8e8ed]">Envío 24h</span>
              </motion.div>

              {/* Floating badge — rating */}
              <motion.div
                initial={{ opacity: 0, x: -16, y: 16 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.5, delay: 1.1 }}
                className="absolute bottom-6 left-2 sm:left-6 flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-sm"
                style={{ background: 'rgba(17,17,20,0.88)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <span className="text-amber-400 text-sm leading-none">★</span>
                <span className="text-xs font-semibold text-[#e8e8ed]">5.0 Satisfacción</span>
              </motion.div>
            </div>
          </div>

          {/* Bottom: mini product preview cards */}
          {!loading && products.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="mt-12 lg:mt-14 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide"
            >
              <span className="shrink-0 text-xs font-medium text-[#8e8e9a] whitespace-nowrap">Destacados</span>
              <div className="w-px h-4 bg-white/15 shrink-0" />
              {products.slice(0, 3).map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  whileHover={{ y: -2 }}
                  onClick={() => navigate(`/productos/${p.id}`, { state: { product: p } })}
                  className="shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-2xl transition-all duration-200 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#1a1a1f] overflow-hidden shrink-0 border border-white/6">
                    {p.imagenUrl ? (
                      <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-base">📦</div>
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-medium text-[#e8e8ed] truncate max-w-[100px]">{p.nombre}</p>
                    <p className="text-xs font-bold text-[#4f7cff]">{formatPrice(p.precio)}</p>
                  </div>
                </motion.button>
              ))}
              <Link
                to="/productos"
                className="shrink-0 px-3 py-2 rounded-2xl text-xs font-medium text-[#4f7cff] border border-[#4f7cff]/20 hover:bg-[#4f7cff]/10 transition-colors whitespace-nowrap"
              >
                Ver todos →
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div ref={featuredRef} className="flex items-center justify-between mb-10 hc-reveal">
          <div>
            <h2 className="text-2xl font-bold text-[#e8e8ed]">{t('home.destacados')}</h2>
            <p className="text-sm text-[#8e8e9a] mt-1">{t('home.destacadosSub')}</p>
          </div>
          <Link to="/productos" className="text-sm text-[#4f7cff] hc-underline-hover transition-colors">
            {t('home.verTodos')}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-[#111114] border border-white/6 h-56 sm:h-72 animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={stagger.container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={handleAdd} />
            ))}
          </motion.div>
        )}
      </section>

      {/* How to buy section */}
      <section id="como-comprar" className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4f7cff]/10 border border-[#4f7cff]/20 text-sm text-[#4f7cff] mb-4">
            {t('home.procesoBadge')}
          </div>
          <h2 className="text-3xl font-bold text-[#e8e8ed]">{t('home.comoComprarTitle')}</h2>
          <p className="text-[#8e8e9a] mt-2">{t('home.comoComprarSub')}</p>
        </motion.div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                icon: <SearchStepIcon />,
                title: t('home.step1Title'),
                desc: t('home.step1Desc'),
                color: 'text-[#4f7cff]',
                glow: 'bg-[#4f7cff]/10',
                border: 'border-[#4f7cff]/20',
              },
              {
                step: '02',
                icon: <CartStepIcon />,
                title: t('home.step2Title'),
                desc: t('home.step2Desc'),
                color: 'text-purple-400',
                glow: 'bg-purple-500/10',
                border: 'border-purple-500/20',
              },
              {
                step: '03',
                icon: <WhatsStepIcon />,
                title: t('home.step3Title'),
                desc: t('home.step3Desc'),
                color: 'text-[#25D366]',
                glow: 'bg-[#25D366]/10',
                border: 'border-[#25D366]/20',
              },
              {
                step: '04',
                icon: <TruckStepIcon />,
                title: t('home.step4Title'),
                desc: t('home.step4Desc'),
                color: 'text-amber-400',
                glow: 'bg-amber-500/10',
                border: 'border-amber-500/20',
              },
            ].map(({ step, icon, title, desc, color, glow, border }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="hc-step-card relative flex flex-col items-center text-center p-6 rounded-2xl bg-[#111114] border border-white/8"
              >
                <div className={`hc-step-icon w-14 h-14 rounded-2xl ${glow} border ${border} flex items-center justify-center mb-4 ${color}`}>
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
        <div ref={featuresRef} className="hc-reveal max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
                className="hc-glass-card flex items-start gap-4 p-6"
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

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden p-12"
          style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
        >
          {/* Multi-layer gradient backdrop */}
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
            <p className="mb-8 max-w-md mx-auto" style={{ color: 'var(--hc-muted)' }}>
              {t('home.ctaSub')}
            </p>
            <Link
              to="/productos"
              className="hc-btn hc-btn-primary hc-btn-lg inline-flex"
            >
              {t('home.ctaBtn')}
            </Link>
          </div>
        </motion.div>
      </section>
    </MainLayout>
  )
}

// ─── Testimonials ────────────────────────────────────────────────────────────

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
    TESTIMONIALS[(idx) % TESTIMONIALS.length],
    TESTIMONIALS[(idx + 1) % TESTIMONIALS.length],
    TESTIMONIALS[(idx + 2) % TESTIMONIALS.length],
  ]

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-10"
      >
        <h2 className="text-2xl font-bold text-[#e8e8ed]">{t('home.testimoniosTitle')}</h2>
        <p className="text-sm text-[#8e8e9a] mt-1">{t('home.testimoniosSub')}</p>
      </motion.div>

      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-hidden">
          {visible.map((t, i) => (
            <motion.div
              key={idx + i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="hc-glass-card p-6 flex flex-col gap-3"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, s) => (
                  <svg key={s} className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--hc-muted)' }}>"{t.text}"</p>
              <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--hc-border)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 15%, transparent)', color: 'var(--hc-accent)' }}>
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

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button onClick={prev} aria-label="Testimonio anterior" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="flex gap-1.5">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} aria-label={`Ir al testimonio ${i + 1}`} className={`w-2.5 h-2.5 rounded-full transition-all ${i === idx ? 'bg-[#4f7cff] w-4' : 'bg-white/20'}`} />
            ))}
          </div>
          <button onClick={next} aria-label="Testimonio siguiente" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── Step icons ──────────────────────────────────────────────────────────────
const si = 'w-6 h-6'
const ss = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

function SearchStepIcon() {
  return <svg className={si} viewBox="0 0 24 24" {...ss}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function CartStepIcon() {
  return <svg className={si} viewBox="0 0 24 24" {...ss}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
}
function WhatsStepIcon() {
  return <svg className={si} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
}
function TruckStepIcon() {
  return <svg className={si} viewBox="0 0 24 24" {...ss}><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
}

function HeadphonesIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_32px_rgba(79,124,255,0.35)]" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Arc / headband */}
      <path d="M40 110 C40 60 160 60 160 110" stroke="#4f7cff" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.9"/>
      {/* Left cup outer */}
      <rect x="20" y="108" width="36" height="48" rx="18" fill="#1a1a2e" stroke="#4f7cff" strokeWidth="3" opacity="0.95"/>
      {/* Left cup inner glow */}
      <rect x="28" y="116" width="20" height="32" rx="10" fill="#4f7cff" opacity="0.18"/>
      <rect x="28" y="116" width="20" height="32" rx="10" stroke="#4f7cff" strokeWidth="1.5" opacity="0.5"/>
      {/* Right cup outer */}
      <rect x="144" y="108" width="36" height="48" rx="18" fill="#1a1a2e" stroke="#4f7cff" strokeWidth="3" opacity="0.95"/>
      {/* Right cup inner glow */}
      <rect x="152" y="116" width="20" height="32" rx="10" fill="#4f7cff" opacity="0.18"/>
      <rect x="152" y="116" width="20" height="32" rx="10" stroke="#4f7cff" strokeWidth="1.5" opacity="0.5"/>
      {/* Headband highlight */}
      <path d="M60 78 C80 65 120 65 140 78" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.15"/>
      {/* Speaker dots left */}
      <circle cx="38" cy="132" r="3" fill="#4f7cff" opacity="0.7"/>
      {/* Speaker dots right */}
      <circle cx="162" cy="132" r="3" fill="#4f7cff" opacity="0.7"/>
    </svg>
  )
}

function ProductCard({ product, onAdd }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [addState, setAddState] = useState('idle')
  const stockDot = product.stock === 0 ? 'bg-red-400' : product.stock <= 3 ? 'bg-amber-400' : 'bg-emerald-400'
  const stockLabel = product.stock === 0
    ? t('common.outOfStock')
    : product.stock <= 3
    ? t('products.lowStock', { count: product.stock })
    : t('common.inStock')
  const stockColor = product.stock === 0 ? 'text-red-400' : product.stock <= 3 ? 'text-amber-400' : 'text-emerald-400'

  return (
    <motion.div
      variants={stagger.item}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
      onClick={() => navigate(`/productos/${product.id}`, { state: { product } })}
    >
      {/* Image */}
      <div className="relative h-36 sm:h-48 bg-[#1a1a1f] flex items-center justify-center overflow-hidden">
        {product.imagenUrl ? (
          <img
            src={product.imagenUrl}
            alt={product.nombre}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
          />
        ) : (
          <span className="text-5xl opacity-30 group-hover:opacity-50 transition-opacity">📦</span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="text-xs font-semibold text-white/60 bg-black/40 px-3 py-1 rounded-full">{t('common.outOfStock')}</span>
          </div>
        )}
        {/* Quick-add overlay */}
        {product.stock > 0 && (
          <>
            <div className="hc-card-overlay" />
            <div className="hc-quick-add absolute bottom-0 left-0 right-0 p-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (addState !== 'idle') return
                  setAddState('adding')
                  setTimeout(() => {
                    onAdd(product)
                    setAddState('added')
                    setTimeout(() => setAddState('idle'), 1300)
                  }, 180)
                }}
                className={`w-full h-8 rounded-xl text-xs font-bold transition-all duration-200 ${
                  addState === 'added'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white'
                }`}
              >
                {addState === 'added' ? '✓ Añadido' : addState === 'adding' ? '···' : `+ ${t('products.addToCart')}`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <h3 className="font-medium text-xs sm:text-sm leading-snug line-clamp-2 mb-2.5 group-hover:text-white transition-colors" style={{ color: 'var(--hc-text)' }}>
          {product.nombre}
        </h3>
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm sm:text-base" style={{ color: 'var(--hc-text)' }}>{formatPrice(product.precio)}</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stockDot}`} />
            <span className={`text-[10px] sm:text-xs font-medium ${stockColor}`}>{stockLabel}</span>
          </div>
        </div>
        {/* Mobile fallback button */}
        {product.stock > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (addState !== 'idle') return
              setAddState('adding')
              setTimeout(() => {
                onAdd(product)
                setAddState('added')
                setTimeout(() => setAddState('idle'), 1300)
              }, 180)
            }}
            className={`sm:hidden mt-2.5 w-full h-8 rounded-xl text-xs font-medium transition-all duration-200 ${
              addState === 'added'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : ''
            }`}
            style={addState === 'added' ? {} : { background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 25%, transparent)' }}
          >
            {addState === 'added' ? '✓ Añadido' : t('products.addToCart')}
          </button>
        )}
      </div>
    </motion.div>
  )
}
