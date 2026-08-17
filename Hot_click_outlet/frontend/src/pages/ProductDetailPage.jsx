import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { Helmet } from 'react-helmet-async'
import Seo from '@/components/seo/Seo'
import { generateProductJsonLd, generateBreadcrumbJsonLd } from '@/utils/jsonLd'
import Spinner from '@/components/ui/Spinner'
import { productService, normalizeProduct } from '@/services/productService'
import useCartStore from '@/store/cartStore'
import useRecentlyViewedStore from '@/store/recentlyViewedStore'
import { useToast } from '@/components/ui/Toast'
import { analytics } from '@/utils/analytics'
import AIProductSection from '@/components/ai/AIProductSection'
import { parseTallas, seoDesdeProducto, tabsDesdeProducto } from './producto/productoHelpers'
import StickyCartBar from './producto/StickyCartBar'
import ProductBreadcrumb from './producto/ProductBreadcrumb'
import ProductGallery from './producto/ProductGallery'
import ProductInfo from './producto/ProductInfo'
import ProductVideo from './producto/ProductVideo'
import ProductTabs from './producto/ProductTabs'
import BrandProductsRow from './producto/BrandProductsRow'
import RecommendationsRow from './producto/RecommendationsRow'
import RecentlyViewedGrid from './producto/RecentlyViewedGrid'

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
  const [tallaSeleccionada, setTallaSeleccionada] = useState(null)
  const addTimeout = useRef(null)
  const mainCTARef = useRef(null)
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addItem)
  const recentlyViewed = useRecentlyViewedStore((s) => s.items)

  useEffect(() => {
    const controller = new AbortController()
    /* eslint-disable react-hooks/set-state-in-effect -- reset de ficha al cambiar id */
    setLoading(true)
    setRecommendations([])
    setGaleria([])
    setActiveImg(0)
    /* eslint-enable react-hooks/set-state-in-effect */
    productService.getById(id, { signal: controller.signal })
      .then(({ data }) => {
        const p = normalizeProduct(data)
        setProduct(p)
        setTallaSeleccionada(parseTallas(p.talla)[0] ?? null)
        addRecentlyViewed(p)
        analytics.productView(p)
        if (p.especificaciones?.trim()) setActiveTab('especificaciones')
        else if (p.comoUsar?.trim()) setActiveTab('como-usar')
      })
      .catch((err) => { if (err.name !== 'CanceledError') navigate('/productos') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarga solo al cambiar el id de ruta
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- galería sigue al id; imagenUrl es del mismo producto
  }, [product?.id])

  // Fetch same-category recommendations
  useEffect(() => {
    if (!product) return
    const controller = new AbortController()
    productService.getRecommendations(product.id, { signal: controller.signal })
      .then((recs) => setRecommendations(recs))
      .catch(() => {})
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomendaciones por id de producto
  }, [product?.id])

  // Fetch same-brand products
  useEffect(() => {
    if (!product?.marcaId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin marca no hay carrusel
      setBrandProducts([])
      return
    }
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
    if (!product?.grupoVarianteId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin grupo no hay swatches
      setVariantes([])
      return
    }
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
  const tabs = tabsDesdeProducto(product, t)
  const userLang = (navigator.language || 'es').split('-')[0].toLowerCase()
  const { seoTitle, seoDescription } = seoDesdeProducto(product, userLang)

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
    addItem({ ...normalizeProduct(product), tallaSeleccionada }, quantity)
    const qtyPrefix = quantity > 1 ? `${quantity}× ` : ''
    toast({
      message: t('product.added', { name: `${qtyPrefix}${product.nombre}` }),
      type: 'success',
    })
    setJustAdded(true)
    addTimeout.current = setTimeout(() => setJustAdded(false), 1400)
  }

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

        <ProductBreadcrumb product={product} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-10">
          <ProductGallery
            product={product}
            galeria={galeria}
            activeImg={activeImg}
            onSelectImg={setActiveImg}
          />
          <ProductInfo
            product={product}
            variantes={variantes}
            tallaSeleccionada={tallaSeleccionada}
            onSelectTalla={setTallaSeleccionada}
            quantity={quantity}
            onDecrease={handleDecrease}
            onIncrease={handleIncrease}
            onAdd={handleAdd}
            justAdded={justAdded}
            inStock={inStock}
            atMax={atMax}
            mainCTARef={mainCTARef}
          />
        </div>

        <ProductVideo product={product} />

        <ProductTabs
          product={product}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="mt-6 sm:mt-10">
          <AIProductSection product={product} />
        </div>

        <BrandProductsRow product={product} brandProducts={brandProducts} />
        <RecommendationsRow recommendations={recommendations} />
        <RecentlyViewedGrid items={recentlyViewed} currentProductId={product.id} />

      </div>

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
