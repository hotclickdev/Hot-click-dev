import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { Helmet } from 'react-helmet-async'
import Seo from '@/components/seo/Seo'
import { generateProductJsonLd } from '@/utils/jsonLd'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { productService, normalizeProduct } from '@/services/productService'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import useRecentlyViewedStore from '@/store/recentlyViewedStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, conditionLabel } from '@/utils/format'
import { analytics } from '@/utils/analytics'
import SocialProof from '@/components/ui/SocialProof'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()
  const { t } = useTranslation()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState(null)
  const [justAdded, setJustAdded] = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const addTimeout = useRef(null)
  const mainCTARef = useRef(null)
  const { toggle: toggleWishlist, isLiked } = useWishlistStore()
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addItem)
  const recentlyViewed = useRecentlyViewedStore((s) => s.items)

  useEffect(() => {
    setLoading(true)
    setRecommendations([])
    productService.getById(id)
      .then(({ data }) => {
        const p = normalizeProduct(data)
        setProduct(p)
        addRecentlyViewed(p)
        analytics.productView(p)
        if (p.especificaciones?.trim()) setActiveTab('especificaciones')
        else if (p.comoUsar?.trim()) setActiveTab('como-usar')
      })
      .catch(() => navigate('/productos'))
      .finally(() => setLoading(false))
  }, [id])

  // Fetch same-category recommendations
  useEffect(() => {
    if (!product) return
    productService.getAll(0, 24)
      .then(({ data }) => {
        const all = (data.content ?? data ?? []).map(normalizeProduct)
        const sameCat = all.filter((p) => p.id !== product.id && p.categoriaId === product.categoriaId && p.stock > 0)
        if (sameCat.length >= 3) {
          setRecommendations(sameCat.slice(0, 6))
        } else {
          setRecommendations(
            all.filter((p) => p.id !== product.id && p.stock > 0).slice(0, 6)
          )
        }
      })
      .catch(() => {})
  }, [product?.id])

  useEffect(() => () => clearTimeout(addTimeout.current), [])

  useEffect(() => {
    if (loading) return
    const el = mainCTARef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading])

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-32"><Spinner size="xl" /></div>
      </MainLayout>
    )
  }

  if (!product) return null

  const inStock = product.stock > 0
  const atMax = quantity >= product.stock

  const tabs = [
    product.especificaciones?.trim() ? { id: 'especificaciones', label: t('product.specsTab') } : null,
    product.comoUsar?.trim()        ? { id: 'como-usar',        label: t('product.howToUseTab') } : null,
  ].filter(Boolean)

  const stockBadge = product.stock === 0 ? 'danger' : product.stock <= 3 ? 'warning' : 'success'
  const stockLabel = product.stock === 0
    ? t('product.outOfStock')
    : product.stock <= 3
    ? t('product.lowStock', { count: product.stock })
    : t('product.inStock')

  const handleDecrease = () => setQuantity((q) => Math.max(1, q - 1))

  const handleIncrease = () => {
    if (atMax) {
      toast({
        message: t('product.lowStock', { count: product.stock }),
        type: 'warning',
      })
      return
    }
    setQuantity((q) => q + 1)
  }

  const handleAdd = () => {
    if (!inStock || justAdded) return
    for (let i = 0; i < quantity; i++) addItem(normalizeProduct(product))
    toast({
      message: t('product.added', { name: `${quantity > 1 ? `${quantity}× ` : ''}${product.nombre}` }),
      type: 'success',
    })
    setJustAdded(true)
    addTimeout.current = setTimeout(() => setJustAdded(false), 1400)
  }

  const seoTitle = product.metaTitle || `${product.titulo || product.nombre} | HOTCLICK Outlet`
  const seoDescription = product.metaDescription || `${product.descripcion || product.nombre} | Precio: ₡${new Intl.NumberFormat('es-CR').format(product.precio)} | Envíos en Costa Rica`

  return (
    <MainLayout>
      <Seo
        title={seoTitle}
        description={seoDescription}
        image={product.imagenUrl}
        type="product"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(generateProductJsonLd(product, window.location.origin))}
        </script>
      </Helmet>
      <div className={`max-w-5xl mx-auto px-4 sm:px-6 py-10 transition-[padding] duration-300 ${showSticky ? 'pb-28 sm:pb-24' : ''}`}>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#8e8e9a] mb-8">
          <button onClick={() => navigate('/productos')} className="hover:text-white transition-colors">
            {t('product.productsNav')}
          </button>
          <span>/</span>
          <span className="text-[#e8e8ed] truncate max-w-xs">{product.titulo || product.nombre}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* ── Imagen ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="aspect-square rounded-2xl bg-[#111114] border border-white/8 flex items-center justify-center overflow-hidden"
          >
            {product.imagenUrl ? (
              <img
                src={product.imagenUrl}
                alt={product.nombre}
                width={800}
                height={800}
                className="w-full aspect-square object-cover"
                fetchPriority="high"
                loading="eager"
              />
            ) : (
              <span className="text-8xl opacity-20">📦</span>
            )}
          </motion.div>

          {/* ── Info ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-5"
          >
            {/* Título + badges */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {product.marcaNombre && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: 'rgba(140,92,246,0.12)', color: 'var(--hc-accent)', border: '1px solid rgba(140,92,246,0.25)' }}>
                    {product.marcaLogoUrl && (
                      <img src={product.marcaLogoUrl} alt="" className="w-4 h-4 object-contain rounded-sm" onError={(e) => { e.target.style.display = 'none' }} />
                    )}
                    {product.marcaNombre}
                  </span>
                )}
                {product.condicion && (
                  <Badge variant={product.condicion === 'NUEVO' ? 'success' : 'warning'}>
                    {conditionLabel(product.condicion)}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#e8e8ed] leading-tight">
                {product.titulo || product.nombre}
              </h1>
              {product.titulo && product.titulo !== product.nombre && (
                <p className="text-sm text-[#8e8e9a]">{product.nombre}</p>
              )}
              <Badge variant={stockBadge}>{stockLabel}</Badge>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
                ✓ Garantía 40 días
              </span>
            </div>

            {/* Precio + wishlist */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-4xl font-bold text-[#e8e8ed]">
                {formatPrice(product.precio)}
              </span>
              <motion.button
                onClick={() => toggleWishlist(product)}
                whileTap={{ scale: 0.78 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  isLiked(product.id)
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'border-white/10 text-[#8e8e9a] hover:text-white hover:border-white/25'
                }`}
              >
                <HeartDetailIcon filled={isLiked(product.id)} />
                <span className="hidden sm:inline">{isLiked(product.id) ? 'Guardado' : 'Guardar'}</span>
              </motion.button>
            </div>

            {/* Social proof */}
            <SocialProof productId={product.id} />

            {/* Descripción */}
            {product.descripcion && (
              <p className="text-sm text-[#8e8e9a] leading-relaxed">{product.descripcion}</p>
            )}

            {/* Urgency: low stock */}
            {inStock && product.stock <= 5 && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 w-fit"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="text-xs font-medium text-amber-400">
                  {product.stock <= 3
                    ? `¡Solo quedan ${product.stock} unidades!`
                    : `Solo ${product.stock} unidades disponibles`}
                </span>
              </motion.div>
            )}

            {/* ── Selector de cantidad ── */}
            {inStock && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#8e8e9a] shrink-0">Cantidad</span>

                <div className="flex items-center rounded-2xl border border-white/12 bg-white/4 overflow-hidden">
                  {/* Botón − */}
                  <motion.button
                    onClick={handleDecrease}
                    disabled={quantity <= 1}
                    whileTap={{ scale: 0.85 }}
                    className="w-12 h-12 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:cursor-not-allowed transition-colors select-none"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M5 12h14" />
                    </svg>
                  </motion.button>

                  {/* Número animado */}
                  <div className="w-12 flex items-center justify-center overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={quantity}
                        initial={{ opacity: 0, y: -12, scale: 0.7 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.7 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="text-base font-bold text-[#e8e8ed] select-none"
                      >
                        {quantity}
                      </motion.span>
                    </AnimatePresence>
                  </div>

                  {/* Botón + */}
                  <motion.button
                    onClick={handleIncrease}
                    disabled={atMax}
                    whileTap={atMax ? { x: [0, 4, -4, 4, 0] } : { scale: 0.85 }}
                    transition={{ duration: 0.3 }}
                    className="w-12 h-12 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:cursor-not-allowed transition-colors select-none"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </motion.button>
                </div>

                {/* Label de stock */}
                <AnimatePresence mode="wait">
                  {atMax ? (
                    <motion.span
                      key="max"
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      className="text-xs font-medium text-amber-400"
                    >
                      Máximo disponible
                    </motion.span>
                  ) : (
                    <motion.span
                      key="stock"
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      className="text-xs text-[#8e8e9a]"
                    >
                      de {product.stock}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Botón añadir al carrito ── */}
            <motion.button
              ref={mainCTARef}
              onClick={handleAdd}
              disabled={!inStock}
              whileTap={inStock && !justAdded ? { scale: 0.97 } : {}}
              className={`relative h-14 rounded-2xl font-semibold text-sm overflow-hidden transition-all duration-300 ${
                !inStock
                  ? 'bg-white/5 text-[#8e8e9a] cursor-not-allowed border border-white/8'
                  : justAdded
                  ? 'bg-emerald-500 text-white shadow-[0_0_28px_rgba(16,185,129,0.45)]'
                  : 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white shadow-[0_0_20px_rgba(79,124,255,0.3)] hover:shadow-[0_0_36px_rgba(79,124,255,0.5)]'
              }`}
            >
              {/* Ripple al hacer click */}
              <AnimatePresence>
                {justAdded && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-white pointer-events-none"
                  />
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {justAdded ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.6, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.6, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <motion.svg
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.35, delay: 0.05 }}
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <motion.path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </motion.svg>
                    <span>Añadido</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="add"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center gap-2.5"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span>{inStock ? t('product.addToCart') : t('product.outOfStock')}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { svg: <TrustShieldSVG />, text: 'Garantía 40 días', color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15' },
                { svg: <TrustLockSVG />, text: 'Pago 100% seguro', color: 'text-[#4f7cff]', bg: 'bg-[#4f7cff]/8', border: 'border-[#4f7cff]/15' },
                { svg: <TrustWASVG />, text: 'Soporte WhatsApp', color: 'text-[#25D366]', bg: 'bg-[#25D366]/8', border: 'border-[#25D366]/15' },
                { svg: <TrustTruckSVG />, text: 'Envío a todo CR', color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/15' },
              ].map(({ svg, text, color, bg, border }) => (
                <div key={text} className={`flex items-center gap-2.5 p-3 rounded-xl ${bg} border ${border}`}>
                  <span className={`shrink-0 ${color}`}>{svg}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Tabs: Especificaciones / Cómo usar ── */}
        {tabs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mt-12"
          >
            {/* Tab bar */}
            <div className="flex gap-1 border-b border-white/10 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id ? 'text-white' : 'text-[#8e8e9a] hover:text-white'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f7cff] rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Contenido: Especificaciones */}
            <AnimatePresence mode="wait">
              {activeTab === 'especificaciones' && product.especificaciones?.trim() && (
                <motion.div
                  key="specs"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#111114] border border-white/8 rounded-2xl p-6"
                >
                  <ul className="space-y-3">
                    {product.especificaciones.split('\n').filter((l) => l.trim()).map((linea, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 text-sm"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#4f7cff] shrink-0" />
                        <span className="text-[#c8c8d0]">{linea.replace(/^[-•·]\s*/, '')}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Contenido: Cómo usar */}
              {activeTab === 'como-usar' && product.comoUsar?.trim() && (
                <motion.div
                  key="howto"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#111114] border border-white/8 rounded-2xl p-6"
                >
                  <ol className="space-y-5">
                    {product.comoUsar.split('\n').filter((l) => l.trim()).map((linea, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-4"
                      >
                        <span className="shrink-0 w-7 h-7 rounded-full bg-[#4f7cff]/15 border border-[#4f7cff]/30 text-[#4f7cff] text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm text-[#c8c8d0] pt-1 leading-relaxed">
                          {linea.replace(/^\d+\.\s*/, '')}
                        </span>
                      </motion.li>
                    ))}
                  </ol>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── También te puede gustar ── */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mt-12"
          >
            <h2 className="text-xl font-bold text-[#e8e8ed] mb-5">También te puede gustar</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {recommendations.map((rec, i) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(`/productos/${rec.id}`)}
                  className="group cursor-pointer rounded-2xl overflow-hidden transition-shadow duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
                  style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                >
                  <div className="h-24 bg-[#1a1a1f] flex items-center justify-center overflow-hidden">
                    {rec.imagenUrl ? (
                      <img
                        src={rec.imagenUrl}
                        alt={rec.nombre}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-3xl opacity-20">📦</span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] font-medium line-clamp-2 mb-1 leading-snug" style={{ color: 'var(--hc-text)' }}>
                      {rec.nombre}
                    </p>
                    <p className="text-xs font-bold text-[#4f7cff]">{formatPrice(rec.precio)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Visto recientemente ── */}
        {recentlyViewed.filter((p) => p.id !== product.id).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="mt-10"
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--hc-muted)' }}>
              Visto recientemente
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {recentlyViewed
                .filter((p) => p.id !== product.id)
                .map((p) => (
                  <motion.button
                    key={p.id}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate(`/productos/${p.id}`)}
                    className="shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-2xl transition-all"
                    style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#1a1a1f] overflow-hidden shrink-0 border border-white/6">
                      {p.imagenUrl ? (
                        <img src={p.imagenUrl} alt={p.nombre} width={36} height={36} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-sm">📦</span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium max-w-[100px] truncate" style={{ color: 'var(--hc-text)' }}>
                        {p.nombre}
                      </p>
                      <p className="text-xs font-bold text-[#4f7cff]">{formatPrice(p.precio)}</p>
                    </div>
                  </motion.button>
                ))}
            </div>
          </motion.div>
        )}

      </div>

      {/* ── Sticky Add to Cart ── */}
      <AnimatePresence>
        {showSticky && inStock && (
          <StickyCartBar
            product={product}
            quantity={quantity}
            onDecrease={handleDecrease}
            onIncrease={handleIncrease}
            onAdd={handleAdd}
            justAdded={justAdded}
            atMax={atMax}
            inStock={inStock}
          />
        )}
      </AnimatePresence>
    </MainLayout>
  )
}

// ── Sticky Cart Bar ───────────────────────────────────────────────────────────

function StickyCartBar({ product, quantity, onDecrease, onIncrease, onAdd, justAdded, atMax, inStock }) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 42 }}
      className="fixed left-0 right-0 z-50 bottom-16 md:bottom-0 backdrop-blur-2xl"
      style={{
        background: 'color-mix(in srgb, var(--hc-surface) 90%, transparent)',
        borderTop: '1px solid var(--hc-border)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        {/* Thumbnail + info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#1a1a1f] overflow-hidden shrink-0 border border-white/8">
            {product.imagenUrl ? (
              <img src={product.imagenUrl} alt={product.nombre} width={44} height={44} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
            )}
          </div>
          <div className="min-w-0 hidden sm:block">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--hc-text)' }}>
              {product.titulo || product.nombre}
            </p>
            <p className="text-sm font-bold text-[#4f7cff]">{formatPrice(product.precio)}</p>
          </div>
          <p className="text-sm font-bold text-[#4f7cff] sm:hidden">{formatPrice(product.precio)}</p>
        </div>

        {/* Quantity selector */}
        <div className="flex items-center rounded-xl border overflow-hidden shrink-0" style={{ borderColor: 'var(--hc-border)' }}>
          <button
            onClick={onDecrease}
            disabled={quantity <= 1}
            aria-label={t('common.previous')}
            className="w-9 h-9 flex items-center justify-center text-[#8e8e9a] hover:text-white disabled:opacity-25 transition-colors select-none text-lg"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-bold" aria-live="polite" style={{ color: 'var(--hc-text)' }}>
            {quantity}
          </span>
          <button
            onClick={onIncrease}
            disabled={atMax}
            aria-label={t('common.next')}
            className="w-9 h-9 flex items-center justify-center text-[#8e8e9a] hover:text-white disabled:opacity-25 transition-colors select-none text-lg"
          >
            +
          </button>
        </div>

        {/* CTA */}
        <motion.button
          onClick={onAdd}
          whileTap={inStock && !justAdded ? { scale: 0.95 } : {}}
          disabled={!inStock}
          className={`shrink-0 h-10 px-5 sm:px-7 rounded-xl font-bold text-sm transition-all duration-300 ${
            justAdded
              ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
              : inStock
              ? 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white shadow-[0_0_20px_rgba(79,124,255,0.35)] hover:shadow-[0_0_32px_rgba(79,124,255,0.55)]'
              : 'bg-white/5 text-[#8e8e9a] cursor-not-allowed'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {justAdded ? (
              <motion.span
                key="done"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">Añadido</span>
              </motion.span>
            ) : (
              <motion.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Agregar
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Heart icon for detail page ────────────────────────────────────────────────

function HeartDetailIcon({ filled }) {
  return filled ? (
    <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}

// ── Trust badge icons ─────────────────────────────────────────────────────────

function TrustShieldSVG() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
function TrustLockSVG() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}
function TrustWASVG() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
function TrustTruckSVG() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}
