import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'
import { productService, normalizeProduct } from '@/services/productService'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'

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
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const leftY = useTransform(scrollYProgress, [0, 1], [0, -120])
  const leftRotate = useTransform(scrollYProgress, [0, 1], [0, -15])
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
    toast({ message: `${product.nombre} añadido al carrito`, type: 'success' })
  }

  return (
    <MainLayout>
      {/* Hero */}
      <section ref={heroRef} className="relative min-h-[78vh] sm:min-h-[92vh] flex items-center overflow-hidden">
        {/* Bg glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#4f7cff]/8 rounded-full blur-[130px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/6 rounded-full blur-[100px]" />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4f7cff]/10 border border-[#4f7cff]/20 text-sm text-[#4f7cff] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4f7cff] animate-pulse" />
              Tecnología premium en Costa Rica
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-[#e8e8ed] leading-[1.1] tracking-tight mb-5 sm:mb-6 text-balance">
              Descubre lo{' '}
              <span className="text-gradient-accent inline-block">último</span>{' '}
              en tecnología
            </h1>

            <p className="text-lg sm:text-xl text-[#8e8e9a] max-w-xl mx-auto mb-10 leading-relaxed">
              Productos de calidad, precios accesibles. La tienda tech más confiable de Costa Rica.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/productos"
                className="inline-flex items-center justify-center gap-2 h-13 px-8 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-base transition-all duration-200 shadow-[0_0_30px_rgba(79,124,255,0.35)] hover:shadow-[0_0_45px_rgba(79,124,255,0.5)] hover:-translate-y-0.5"
              >
                Ver productos
                <span className="text-lg">→</span>
              </Link>
              <a
                href="#como-comprar"
                className="inline-flex items-center justify-center gap-2 h-13 px-8 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-[#e8e8ed] font-semibold text-base transition-all duration-200 hover:-translate-y-0.5"
              >
                ¿Cómo comprar?
              </a>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-6 sm:gap-8 mt-10 sm:mt-20"
          >
            {[
              ['100%', 'Garantía de calidad'],
              ['24h', 'Envíos en GAM'],
              ['5★', 'Satisfacción clientes'],
            ].map(([value, label]) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-[#e8e8ed]">{value}</div>
                <div className="text-sm text-[#8e8e9a] mt-0.5">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating 3D elements — headphones left */}
        <motion.div
          style={{ y: leftY, rotate: leftRotate }}
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: 'easeOut' }}
          className="absolute left-[3%] top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none select-none"
        >
          <div className="relative w-52 h-52">
            <div className="absolute inset-0 bg-[#4f7cff]/10 rounded-full blur-3xl" />
            <HeadphonesIllustration />
          </div>
        </motion.div>

        {/* Floating 3D elements — blender right */}
        <motion.div
          style={{ y: rightY, rotate: rightRotate }}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.65, ease: 'easeOut' }}
          className="absolute right-[3%] top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none select-none"
        >
          <div className="relative w-44 h-44">
            <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-3xl" />
            <BlenderIllustration />
          </div>
        </motion.div>
      </section>

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-bold text-[#e8e8ed]">Productos destacados</h2>
            <p className="text-sm text-[#8e8e9a] mt-1">Seleccionados especialmente para ti</p>
          </div>
          <Link to="/productos" className="text-sm text-[#4f7cff] hover:text-[#3d6ee0] transition-colors">
            Ver todos →
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
            Proceso de compra
          </div>
          <h2 className="text-3xl font-bold text-[#e8e8ed]">¿Cómo comprar?</h2>
          <p className="text-[#8e8e9a] mt-2">Simple, rápido y seguro</p>
        </motion.div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                icon: <SearchStepIcon />,
                title: 'Explora el catálogo',
                desc: 'Navega nuestros productos, filtra por categoría y encuentra lo que buscas.',
                color: 'text-[#4f7cff]',
                glow: 'bg-[#4f7cff]/10',
                border: 'border-[#4f7cff]/20',
              },
              {
                step: '02',
                icon: <CartStepIcon />,
                title: 'Agrega al carrito',
                desc: 'Selecciona los productos que quieres y agrégatelos a tu carrito de compras.',
                color: 'text-purple-400',
                glow: 'bg-purple-500/10',
                border: 'border-purple-500/20',
              },
              {
                step: '03',
                icon: <WhatsStepIcon />,
                title: 'Pide por WhatsApp',
                desc: 'Desde el carrito envíanos tu pedido directo por WhatsApp con un solo clic.',
                color: 'text-[#25D366]',
                glow: 'bg-[#25D366]/10',
                border: 'border-[#25D366]/20',
              },
              {
                step: '04',
                icon: <TruckStepIcon />,
                title: 'Recibe tu producto',
                desc: 'Coordinamos envío por Correos CR a todo el país o retiro en tienda.',
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
                className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-[#111114] border border-white/8 hover:border-white/15 transition-colors"
              >
                <div className={`w-14 h-14 rounded-2xl ${glow} border ${border} flex items-center justify-center mb-4 ${color}`}>
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
      <section className="border-t border-white/6 bg-[#111114]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { icon: '🚚', title: 'Envío a todo Costa Rica', desc: 'Correos CR y retiro en tienda' },
              { icon: '🔒', title: 'Pago 100% seguro', desc: 'Múltiples métodos de pago' },
              { icon: '✓', title: 'Calidad garantizada', desc: 'Productos verificados y revisados' },
            ].map(({ icon, title, desc }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="flex items-start gap-4 p-6 rounded-2xl bg-[#0a0a0b] border border-white/6"
              >
                <span className="text-3xl shrink-0">{icon}</span>
                <div>
                  <h3 className="font-semibold text-[#e8e8ed] mb-1">{title}</h3>
                  <p className="text-sm text-[#8e8e9a]">{desc}</p>
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
          className="relative rounded-3xl bg-[#111114] border border-white/8 p-12 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#4f7cff]/8 to-purple-500/5 pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#e8e8ed] mb-4">
              ¿Listo para tu próxima compra?
            </h2>
            <p className="text-[#8e8e9a] mb-8 max-w-md mx-auto">
              Explora nuestro catálogo completo de productos tech.
            </p>
            <Link
              to="/productos"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold transition-all duration-200 shadow-[0_0_30px_rgba(79,124,255,0.3)] hover:shadow-[0_0_40px_rgba(79,124,255,0.45)]"
            >
              Explorar tienda
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
        <h2 className="text-2xl font-bold text-[#e8e8ed]">Lo que dicen nuestros clientes</h2>
        <p className="text-sm text-[#8e8e9a] mt-1">Experiencias reales de quienes ya compraron</p>
      </motion.div>

      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-hidden">
          {visible.map((t, i) => (
            <motion.div
              key={idx + i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="bg-[#111114] border border-white/8 rounded-2xl p-6 flex flex-col gap-3"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, s) => (
                  <svg key={s} className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p className="text-sm text-[#8e8e9a] leading-relaxed flex-1">"{t.text}"</p>
              <div className="flex items-center gap-2 pt-2 border-t border-white/6">
                <div className="w-7 h-7 rounded-full bg-[#4f7cff]/20 flex items-center justify-center text-xs font-bold text-[#4f7cff]">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#e8e8ed]">{t.name}</p>
                  <p className="text-[10px] text-[#8e8e9a]">{t.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button onClick={prev} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="flex gap-1.5">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-[#4f7cff] w-4' : 'bg-white/20'}`} />
            ))}
          </div>
          <button onClick={next} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/10 transition-colors">
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

function BlenderIllustration() {
  return (
    <svg viewBox="0 0 160 200" className="w-full h-full drop-shadow-[0_0_28px_rgba(168,85,247,0.35)]" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Jar body */}
      <path d="M40 50 L30 150 Q30 162 45 162 L115 162 Q130 162 130 150 L120 50 Z" fill="#111120" stroke="#a855f7" strokeWidth="2.5" opacity="0.95"/>
      {/* Jar highlight */}
      <path d="M46 58 L38 140" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.08"/>
      {/* Jar side shine */}
      <path d="M50 55 L42 145" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" opacity="0.25"/>
      {/* Liquid fill */}
      <path d="M34 120 L33 150 Q33 158 45 158 L115 158 Q127 158 127 150 L126 120 Z" fill="#a855f7" opacity="0.12"/>
      <path d="M34 120 L126 120" stroke="#a855f7" strokeWidth="1.5" opacity="0.4"/>
      {/* Lid */}
      <rect x="35" y="38" width="90" height="16" rx="6" fill="#1a1a2e" stroke="#a855f7" strokeWidth="2.5"/>
      {/* Lid top nub */}
      <rect x="65" y="24" width="30" height="16" rx="8" fill="#1a1a2e" stroke="#a855f7" strokeWidth="2.5"/>
      {/* Blade */}
      <line x1="80" y1="148" x2="60" y2="140" stroke="#e8e8ed" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
      <line x1="80" y1="148" x2="100" y2="140" stroke="#e8e8ed" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
      <circle cx="80" cy="148" r="4" fill="#a855f7" opacity="0.8"/>
      {/* Base */}
      <rect x="25" y="162" width="110" height="22" rx="8" fill="#1a1a2e" stroke="#a855f7" strokeWidth="2"/>
      {/* Base button */}
      <circle cx="80" cy="173" r="6" fill="#a855f7" opacity="0.5"/>
      <circle cx="80" cy="173" r="3" fill="#a855f7" opacity="0.9"/>
    </svg>
  )
}

function ProductCard({ product, onAdd }) {
  const navigate = useNavigate()
  const stockStatus = product.stock === 0
    ? { label: 'Agotado', class: 'text-red-400' }
    : product.stock <= 3
    ? { label: `${product.stock} disp.`, class: 'text-amber-400' }
    : { label: 'En stock', class: 'text-emerald-400' }

  return (
    <motion.div
      variants={stagger.item}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative bg-[#111114] border border-white/8 rounded-2xl overflow-hidden cursor-pointer hover:border-white/15 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300"
      onClick={() => navigate(`/productos/${product.id}`, { state: { product } })}
    >
      {/* Image */}
      <div className="relative h-32 sm:h-44 bg-[#1a1a1f] flex items-center justify-center overflow-hidden">
        {product.imagenUrl ? (
          <img
            src={product.imagenUrl}
            alt={product.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <span className="text-5xl opacity-30 group-hover:opacity-50 transition-opacity">📦</span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-xs font-semibold text-white/60 bg-black/40 px-3 py-1 rounded-full">Agotado</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <h3 className="font-medium text-[#e8e8ed] text-xs sm:text-sm leading-snug line-clamp-2 mb-2 group-hover:text-white transition-colors">
          {product.nombre}
        </h3>
        <div className="flex items-center justify-between mb-2 sm:mb-0">
          <span className="font-bold text-[#e8e8ed] text-sm sm:text-base">{formatPrice(product.precio)}</span>
          <span className={`text-[10px] sm:text-xs font-medium ${stockStatus.class}`}>{stockStatus.label}</span>
        </div>

        {product.stock > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(product) }}
            className="mt-2 sm:mt-3 w-full h-8 sm:h-9 rounded-xl bg-[#4f7cff]/10 hover:bg-[#4f7cff] border border-[#4f7cff]/20 hover:border-[#4f7cff] text-[#4f7cff] hover:text-white text-xs sm:text-sm font-medium transition-all duration-200"
          >
            + Añadir
          </button>
        )}
      </div>
    </motion.div>
  )
}
