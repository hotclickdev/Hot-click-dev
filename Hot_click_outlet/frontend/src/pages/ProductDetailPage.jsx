import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { Helmet } from 'react-helmet-async'
import Seo from '@/components/seo/Seo'
import { generateProductJsonLd, generateBreadcrumbJsonLd } from '@/utils/jsonLd'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { productService, normalizeProduct } from '@/services/productService'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import useRecentlyViewedStore from '@/store/recentlyViewedStore'
import { useToast } from '@/components/ui/Toast'
import { detectarColor } from '@/utils/colorDetector'
import { formatPrice, conditionLabel, conditionVariant } from '@/utils/format'
import { analytics } from '@/utils/analytics'
import SocialProof from '@/components/ui/SocialProof'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { getOptimizedUrl } from '@/utils/imageUtils'
import AIProductSection from '@/components/ai/AIProductSection'

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
  const [brandProducts, setBrandProducts] = useState([])
  const [galeria, setGaleria] = useState([])
  const [activeImg, setActiveImg] = useState(0)
  const [variantes, setVariantes] = useState([])
  const addTimeout = useRef(null)
  const mainCTARef = useRef(null)
  const { toggle: toggleWishlist, isLiked } = useWishlistStore()
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addItem)
  const recentlyViewed = useRecentlyViewedStore((s) => s.items)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setRecommendations([])
    setGaleria([])
    setActiveImg(0)
    productService.getById(id, { signal: controller.signal })
      .then(({ data }) => {
        const p = normalizeProduct(data)
        setProduct(p)
        addRecentlyViewed(p)
        analytics.productView(p)
        if (p.especificaciones?.trim()) setActiveTab('especificaciones')
        else if (p.comoUsar?.trim()) setActiveTab('como-usar')
      })
      .catch((err) => { if (err.name !== 'CanceledError') navigate('/productos') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    if (!product?.id) return
    productService.getImagenes(product.id)
      .then((r) => {
        const imgs = (r.data?.data ?? r.data ?? [])
        const urls = imgs
          .sort((a, b) => (a.posicion ?? 0) - (b.posicion ?? 0))
          .map((i) => i.urlImagen)
          .filter(Boolean)
        if (urls.length > 0) {
          const main = product.imagenUrl
          const todas = main ? [main, ...urls.filter((u) => u !== main)] : urls
          setGaleria(todas)
        } else {
          setGaleria(product.imagenUrl ? [product.imagenUrl] : [])
        }
      })
      .catch(() => { setGaleria(product.imagenUrl ? [product.imagenUrl] : []) })
  }, [product?.id])

  // Fetch same-category recommendations
  useEffect(() => {
    if (!product) return
    const controller = new AbortController()
    productService.getRecommendations(product.id, { signal: controller.signal })
      .then((recs) => setRecommendations(recs))
      .catch(() => {})
    return () => controller.abort()
  }, [product?.id])

  // Fetch same-brand products
  useEffect(() => {
    if (!product?.marcaId) { setBrandProducts([]); return }
    const controller = new AbortController()
    productService.getByMarca(product.marcaId, 0, 8)
      .then(({ data }) => {
        const items = (data?.content ?? data ?? []).filter((p) => p.id !== product.id).slice(0, 6)
        setBrandProducts(items)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [product?.marcaId, product?.id])

  // Otros colores de la misma pieza (swatches)
  useEffect(() => {
    if (!product?.grupoVarianteId) { setVariantes([]); return }
    const controller = new AbortController()
    productService.getVariantes(product.id, { signal: controller.signal })
      .then((vs) => setVariantes(vs.filter((v) => v.id !== product.id)))
      .catch(() => {})
    return () => controller.abort()
  }, [product?.grupoVarianteId, product?.id])

  useEffect(() => () => clearTimeout(addTimeout.current), [])

  useEffect(() => {
    if (loading) return
    const el = mainCTARef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(entry.isIntersecting === false),
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

  let stockBadge = 'success'
  if (product.stock === 0) stockBadge = 'danger'
  else if (product.stock <= 3) stockBadge = 'warning'
  let stockLabel = t('product.inStock')
  if (product.stock === 0) stockLabel = t('product.outOfStock')
  else if (product.stock <= 3) stockLabel = t('product.lowStock', { count: product.stock })

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
    addItem(normalizeProduct(product), quantity)
    const qtyPrefix = quantity > 1 ? `${quantity}× ` : ''
    toast({
      message: t('product.added', { name: `${qtyPrefix}${product.nombre}` }),
      type: 'success',
    })
    setJustAdded(true)
    addTimeout.current = setTimeout(() => setJustAdded(false), 1400)
  }

  const userLang = (navigator.language || 'es').split('-')[0].toLowerCase()
  const seoByLang = {
    es: { title: product.metaTitle,         description: product.metaDescription },
    en: { title: product.metaTitleEn,       description: product.metaDescriptionEn },
    pt: { title: product.metaTitlePt,       description: product.metaDescriptionPt },
    fr: { title: product.metaTitleFr,       description: product.metaDescriptionFr },
  }
  const activeSeo = seoByLang[userLang] ?? {}
  const fallbackTitle = `${product.titulo || product.nombre} | HotClick Outlet`
  const fallbackDesc  = `${product.descripcion || product.nombre} | Precio: ₡${new Intl.NumberFormat('es-CR').format(product.precio)} | Envíos en Costa Rica`
  const seoTitle       = activeSeo.title       || seoByLang.es.title       || fallbackTitle
  const seoDescription = activeSeo.description || seoByLang.es.description || fallbackDesc

  return (
    <MainLayout>
      <Seo
        title={seoTitle}
        description={seoDescription}
        image={product.imagenUrl}
        url={`https://hotclick.lat/productos/${product.id}`}
        type="product"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(generateProductJsonLd(product, globalThis.location.origin))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(generateBreadcrumbJsonLd([
            { name: 'HotClick', url: `${globalThis.location.origin}/` },
            { name: 'Productos', url: `${globalThis.location.origin}/productos` },
            ...(product.marcaNombre ? [{ name: product.marcaNombre, url: `${globalThis.location.origin}/productos?marcaId=${product.marcaId}` }] : []),
            { name: product.titulo || product.nombre, url: globalThis.location.href },
          ]))}
        </script>
      </Helmet>
      <div className={`max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 transition-[padding] duration-300 ${showSticky ? 'pb-28 sm:pb-24' : ''}`}>

        {/* Breadcrumb: Productos / [Marca] / Producto — semántico para SEO */}
        <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm text-[#8e8e9a] mb-3 sm:mb-6 flex-wrap">
          <ol className="flex items-center gap-2 flex-wrap list-none p-0 m-0">
            <li>
              <a href="/productos" onClick={(e) => { e.preventDefault(); navigate('/productos') }}
                className="hover:text-white transition-colors">
                {t('product.productsNav')}
              </a>
            </li>
            {product.marcaNombre && product.marcaId && (
              <li className="flex items-center gap-2">
                <span aria-hidden="true">/</span>
                <a href={`/productos?marcaId=${product.marcaId}&marcaNombre=${encodeURIComponent(product.marcaNombre)}`}
                  onClick={(e) => { e.preventDefault(); navigate(`/productos?marcaId=${product.marcaId}&marcaNombre=${encodeURIComponent(product.marcaNombre)}`) }}
                  className="hover:text-white transition-colors flex items-center gap-1">
                  {product.marcaLogoUrl && (
                    <img src={getOptimizedUrl(product.marcaLogoUrl, { width: 28 })} alt="" className="w-3.5 h-3.5 object-contain rounded-sm" onError={(e) => { e.target.style.display = 'none' }} />
                  )}
                  {product.marcaNombre}
                </a>
              </li>
            )}
            <li className="flex items-center gap-2">
              <span aria-hidden="true">/</span>
              <span className="text-[#e8e8ed] truncate max-w-xs" aria-current="page">
                {product.titulo || product.nombre}
              </span>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-10">

          {/* ── Galería de imágenes ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-3"
          >
            {/* Imagen principal */}
            <div className="aspect-[3/2] sm:aspect-square rounded-2xl bg-[#111114] border border-white/8 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeImg}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full"
                >
                  {galeria[activeImg] ? (
                    <OptimizedImage
                      src={galeria[activeImg]}
                      alt={`${product.titulo || product.nombre}${product.marcaNombre ? ` — ${product.marcaNombre}` : ''} | Disponible en Costa Rica`}
                      width={800}
                      height={800}
                      className="w-full h-full object-cover"
                      priority={true}
                      quality={85}
                    />
                  ) : (
                    <span className="text-8xl opacity-20 flex items-center justify-center w-full h-full">📦</span>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Miniaturas — solo si hay más de 1 imagen */}
            {galeria.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {galeria.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200"
                    style={{
                      borderColor: i === activeImg ? 'var(--hc-accent)' : 'transparent',
                      opacity: i === activeImg ? 1 : 0.55,
                    }}
                  >
                    <img
                      src={getOptimizedUrl(url, { width: 64 })}
                      alt={`${product.nombre} ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Info ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-3 sm:gap-5"
          >
            {/* Título + badges */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {product.marcaNombre && (
                  <button
                    onClick={() => navigate(`/productos?marcaId=${product.marcaId}&marcaNombre=${encodeURIComponent(product.marcaNombre)}`)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(140,92,246,0.12)', color: 'var(--hc-accent)', border: '1px solid rgba(140,92,246,0.25)' }}
                  >
                    {product.marcaLogoUrl && (
                      <img src={product.marcaLogoUrl} alt="" className="w-4 h-4 object-contain rounded-sm" onError={(e) => { e.target.style.display = 'none' }} />
                    )}
                    {product.marcaNombre}
                  </button>
                )}
                {product.condicion && (
                  <Badge variant={conditionVariant(product.condicion)}>
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
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={stockBadge}>{stockLabel}</Badge>
              </div>
              {variantes.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#8e8e9a]">{t('product.otherColors', 'Otros colores')}:</span>
                  <button type="button" onClick={() => {}} disabled
                    className="w-7 h-7 rounded-full ring-2 ring-offset-2 ring-offset-[#0d0d12] ring-[#e8e8ed] shrink-0"
                    style={{ backgroundColor: (product.colorVariante && detectarColor(product.colorVariante).hex) || '#3a3a42' }}
                    title={product.colorVariante || product.nombre} />
                  {variantes.map((v) => {
                    const hex = (v.colorVariante && detectarColor(v.colorVariante).hex) || '#3a3a42'
                    return (
                      <button key={v.id} type="button" onClick={() => navigate(`/productos/${v.id}`)}
                        className="w-7 h-7 rounded-full border border-white/20 shrink-0 hover:scale-110 transition-transform"
                        style={{ backgroundColor: hex }}
                        title={v.colorVariante || v.nombreProducto} />
                    )
                  })}
                </div>
              )}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
                ✓ {t('socialProof.warranty')}
              </span>
            </div>

            {/* Precio + wishlist */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-3xl sm:text-4xl font-bold text-[#e8e8ed]">
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
                <span className="hidden sm:inline">{isLiked(product.id) ? t('product.saved') : t('common.save')}</span>
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
                    ? t('product.urgentStock', { count: product.stock })
                    : t('product.lowStock', { count: product.stock })}
                </span>
              </motion.div>
            )}

            {/* ── Selector de cantidad ── */}
            {inStock && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#8e8e9a] shrink-0">{t('product.quantity')}</span>

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
                      {t('product.maxAvailable')}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="stock"
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      className="text-xs text-[#8e8e9a]"
                    >
                      {t('product.outOf', { count: product.stock })}
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
                  : 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white shadow-[0_0_20px_rgba(23,71,168,0.3)] hover:shadow-[0_0_36px_rgba(23,71,168,0.5)]'
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
                    <span>{t('product.addedBtn')}</span>
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
                      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 001.95 1.61h9.72a2 2 0 001.95-1.61L23 6H6" />
                    </svg>
                    <span>{inStock ? t('product.addToCart') : t('product.outOfStock')}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { svg: <TrustShieldSVG />, text: t('socialProof.warranty'), color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15' },
                { svg: <TrustLockSVG />, text: t('product.trustPayment'), color: 'text-[#4f7cff]', bg: 'bg-[#4f7cff]/8', border: 'border-[#4f7cff]/15' },
                { svg: <TrustWASVG />, text: t('product.trustWhatsapp'), color: 'text-[#25D366]', bg: 'bg-[#25D366]/8', border: 'border-[#25D366]/15' },
                { svg: <TrustTruckSVG />, text: t('product.trustShipping'), color: 'text-amber-400', bg: 'bg-amber-500/8', border: 'border-amber-500/15' },
              ].map(({ svg, text, color, bg, border }) => (
                <div key={text} className={`flex items-center gap-2.5 p-3 rounded-xl ${bg} border ${border}`}>
                  <span className={`shrink-0 ${color}`}>{svg}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Video del producto (YouTube / TikTok / Instagram) ── */}
        {product.videoUrl && detectVideo(product.videoUrl) && (() => {
          const vid = detectVideo(product.videoUrl)
          const icons = {
            youtube:   { bg: 'bg-red-500/15', border: 'border-red-500/25', color: 'text-red-400', icon: <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/> },
            tiktok:    { bg: 'bg-white/8',    border: 'border-white/15',   color: 'text-white',   icon: <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/> },
            instagram: { bg: 'bg-pink-500/15', border: 'border-pink-500/25', color: 'text-pink-400', icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/> },
          }
          const ic = icons[vid.type]
          const isTikTok = vid.type === 'tiktok'
          return (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-6 sm:mt-12"
            >
              <h2 className="text-lg font-bold text-[#e8e8ed] mb-4 flex items-center gap-2">
                <span className={`w-7 h-7 rounded-lg ${ic.bg} border ${ic.border} flex items-center justify-center shrink-0`}>
                  <svg className={`w-3.5 h-3.5 ${ic.color}`} viewBox="0 0 24 24" fill="currentColor">{ic.icon}</svg>
                </span>
                {t('product.videoTitle')}
              </h2>
              <div
                className="relative w-full rounded-2xl overflow-hidden bg-black border border-white/8"
                style={isTikTok ? { paddingBottom: '177.77%', maxWidth: '340px', margin: '0 auto' } : { paddingBottom: '56.25%' }}
              >
                <iframe
                  src={vid.embedUrl}
                  title={`Video de ${product.titulo || product.nombre}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </motion.div>
          )
        })()}

        {/* ── Tabs: Especificaciones / Cómo usar ── */}
        {tabs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mt-5 sm:mt-12"
          >
            {/* Tab bar */}
            <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--hc-border)' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ color: activeTab === tab.id ? 'var(--hc-text)' : 'var(--hc-muted)' }}
                  className="relative px-6 py-3 text-sm font-medium transition-colors hover:[color:var(--hc-text)]"
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
                  style={{ background: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
                  className="border rounded-2xl p-6"
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
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--hc-accent)' }} />
                        <span style={{ color: 'var(--hc-text)' }}>{linea.replace(/^[-•·]\s*/, '')}</span>
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
                  style={{ background: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
                  className="border rounded-2xl p-6"
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
                        <span
                          style={{ background: 'var(--hc-accent)', color: '#fff' }}
                          className="shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm pt-1 leading-relaxed" style={{ color: 'var(--hc-text)' }}>
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

        {/* ── Agente experto del producto ── */}
        <div className="mt-6 sm:mt-10">
          <AIProductSection product={product} />
        </div>

        {/* ── MÁS DE [MARCA] — Logo grande + productos sin precio ── */}
        {brandProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mt-8 sm:mt-16"
          >
            {/* Cabecera: logo grande centrado + botón ver todos */}
            <div className="flex flex-col items-center gap-3 mb-6">
              {product.marcaLogoUrl ? (
                <img
                  src={product.marcaLogoUrl}
                  alt={product.marcaNombre}
                  className="h-14 w-auto object-contain"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              ) : (
                <span className="text-2xl font-black tracking-tight" style={{ color: 'var(--hc-text)' }}>
                  {product.marcaNombre}
                </span>
              )}
              <button
                onClick={() => navigate(`/productos?marcaId=${product.marcaId}&marcaNombre=${encodeURIComponent(product.marcaNombre)}`)}
                className="text-[11px] font-semibold px-4 py-1 rounded-full border transition-opacity hover:opacity-70"
                style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}
              >
                Ver todos los productos
              </button>
            </div>

            {/* Productos: imágenes grandes sin precio */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {brandProducts.map((bp, i) => (
                <motion.div
                  key={bp.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -5 }}
                  onClick={() => navigate(`/productos/${bp.id}`)}
                  className="group shrink-0 cursor-pointer relative rounded-2xl overflow-hidden"
                  style={{ width: 140, height: 140, background: 'var(--hc-surface-2)' }}
                >
                  {bp.imagenUrl ? (
                    <img
                      src={getOptimizedUrl(bp.imagenUrl, { width: 140 })}
                      alt={bp.nombre}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-4xl opacity-20">📦</span>
                  )}
                  {/* Nombre solo en hover */}
                  <div className="absolute inset-x-0 bottom-0 py-2 px-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
                    style={{ background: 'rgba(0,0,0,0.72)' }}>
                    <p className="text-[10px] text-white font-medium line-clamp-2 leading-tight">{bp.nombre}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── TAMBIÉN TE PUEDE GUSTAR — Carrusel rectangular mismo tamaño ── */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mt-7 sm:mt-14"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--hc-muted)' }}>
              {t('product.youMayLike')}
            </p>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {recommendations.slice(0, 5).map((rec, i) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(`/productos/${rec.id}`)}
                  className="group shrink-0 cursor-pointer rounded-2xl overflow-hidden flex flex-col"
                  style={{ width: 160, background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                >
                  {/* Imagen rectangular fija */}
                  <div className="w-full overflow-hidden" style={{ height: 160, background: 'var(--hc-surface-2)' }}>
                    {rec.imagenUrl ? (
                      <img
                        src={getOptimizedUrl(rec.imagenUrl, { width: 160 })}
                        alt={rec.nombre}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-4xl opacity-20">📦</span>
                    )}
                  </div>
                  {/* Info debajo */}
                  <div className="p-3 flex flex-col gap-1">
                    <p className="text-[11px] font-medium line-clamp-2 leading-snug" style={{ color: 'var(--hc-text)' }}>
                      {rec.nombre}
                    </p>
                    <p className="text-sm font-extrabold" style={{ color: 'var(--hc-accent)' }}>
                      {formatPrice(rec.precio)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── VISTO RECIENTEMENTE — Grid 2 columnas compacto ── */}
        {recentlyViewed.some((p) => p.id !== product.id) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="mt-5 sm:mt-10 pt-4 sm:pt-6"
            style={{ borderTop: '1px solid var(--hc-border)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: 'var(--hc-muted)' }}>
              {t('home.recentlyViewed')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {recentlyViewed
                .filter((p) => p.id !== product.id)
                .slice(0, 4)
                .map((p) => (
                  <motion.button
                    key={p.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate(`/productos/${p.id}`)}
                    className="flex items-center gap-2.5 p-2 rounded-xl text-left transition-all"
                    style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ background: 'var(--hc-surface-2)' }}>
                      {p.imagenUrl
                        ? <img src={getOptimizedUrl(p.imagenUrl, { width: 40 })} alt="" width={40} height={40} className="w-full h-full object-cover" loading="lazy" />
                        : <span className="flex items-center justify-center w-full h-full text-sm">📦</span>
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] truncate leading-tight" style={{ color: 'var(--hc-text-2)' }}>{p.nombre}</p>
                      <p className="text-xs font-extrabold mt-0.5" style={{ color: 'var(--hc-accent)' }}>{formatPrice(p.precio)}</p>
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

// ── Detecta plataforma y retorna { type, embedUrl } o null ───────────────────
function detectVideo(url) {
  if (!url) return null

  // YouTube
  const ytPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const re of ytPatterns) {
    const m = url.match(re)
    if (m) return { type: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1` }
  }

  // TikTok — formato completo: tiktok.com/@user/video/ID
  const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
  if (ttMatch) return { type: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}` }

  // Instagram — post o reel
  const igMatch = url.match(/instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/)
  if (igMatch) return { type: 'instagram', embedUrl: `https://www.instagram.com/${igMatch[1]}/${igMatch[2]}/embed/` }

  return null
}

// ── Sticky Cart Bar ───────────────────────────────────────────────────────────

function StickyCartBar({ product, quantity, onDecrease, onIncrease, onAdd, justAdded, atMax, inStock }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 42 }}
      className="fixed left-0 right-0 z-50 backdrop-blur-2xl hc-sticky-cta"
      style={{
        background: 'color-mix(in srgb, var(--hc-surface) 90%, transparent)',
        borderTop: '1px solid var(--hc-border)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        {/* Thumbnail + info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#1a1a1f] overflow-hidden shrink-0 border border-white/8">
            {product.imagenUrl ? (
              <img src={getOptimizedUrl(product.imagenUrl, { width: 44 })} alt={product.nombre} width={44} height={44} className="w-full h-full object-cover" loading="lazy" />
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
          <p className="text-sm font-bold text-[#4f7cff] sm:hidden whitespace-nowrap">{formatPrice(product.precio)}</p>
        </div>

        {/* Quantity selector */}
        <div className="flex items-center rounded-xl border overflow-hidden shrink-0" style={{ borderColor: 'var(--hc-border)' }}>
          <button
            onClick={onDecrease}
            disabled={quantity <= 1}
            aria-label={t('common.previous')}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[#8e8e9a] hover:text-white disabled:opacity-25 transition-colors select-none text-lg"
          >
            −
          </button>
          <span className="w-7 sm:w-8 text-center text-sm font-bold" aria-live="polite" style={{ color: 'var(--hc-text)' }}>
            {quantity}
          </span>
          <button
            onClick={onIncrease}
            disabled={atMax}
            aria-label={t('common.next')}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[#8e8e9a] hover:text-white disabled:opacity-25 transition-colors select-none text-lg"
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
              ? 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white shadow-[0_0_20px_rgba(23,71,168,0.35)] hover:shadow-[0_0_32px_rgba(23,71,168,0.55)]'
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
