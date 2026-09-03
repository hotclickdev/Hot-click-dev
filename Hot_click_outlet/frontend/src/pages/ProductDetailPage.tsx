import { Link, useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Spinner from '@/components/ui/Spinner'
import AIProductSection from '@/components/ai/AIProductSection'
import { seoDesdeProducto, tabsDesdeProducto } from './producto/productoHelpers'
import StickyCartBar from './producto/StickyCartBar'
import ProductBreadcrumb from './producto/ProductBreadcrumb'
import ProductGallery from './producto/ProductGallery'
import ProductInfo from './producto/ProductInfo'
import ProductVideo from './producto/ProductVideo'
import ProductTabs from './producto/ProductTabs'
import BrandProductsRow from './producto/BrandProductsRow'
import RecommendationsRow from './producto/RecommendationsRow'
import RecentlyViewedGrid from './producto/RecentlyViewedGrid'
import ProductDetailSeo from './producto/ProductDetailSeo'
import { useProductDetail } from './producto/useProductDetail'
import { Helmet } from 'react-helmet-async'

export default function ProductDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const {
    product, loading, quantity, activeTab, setActiveTab, justAdded, showSticky,
    recommendations, brandProducts, galeria, activeImg, setActiveImg,
    variantes, tallaSeleccionada, setTallaSeleccionada, mainCTARef,
    recentlyViewed, inStock, atMax, handleDecrease, handleIncrease, handleAdd,
    handleComprarAhora,
    personalizacion, setPersonalizacion, contactoEncargo, setContactoEncargo, enviandoEncargo,
  } = useProductDetail(id, t)

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-32"><Spinner size="xl" /></div>
      </MainLayout>
    )
  }

  if (!product) {
    return (
      <MainLayout>
        <Helmet>
          <title>{t('product.notFound')} | HotClick</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>
            {t('product.notFound')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            {t('notFound.subtitle')}
          </p>
          <Link
            to="/productos"
            className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--hc-accent)' }}
          >
            {t('notFound.comprarHint')}
          </Link>
        </div>
      </MainLayout>
    )
  }
  const tabs = tabsDesdeProducto(product, t)
  const userLang = (navigator.language || 'es').split('-')[0].toLowerCase()
  const { seoTitle, seoDescription } = seoDesdeProducto(product, userLang)

  return (
    <MainLayout>
      <ProductDetailSeo product={product} seoTitle={seoTitle} seoDescription={seoDescription} />
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
            onComprarAhora={handleComprarAhora}
            justAdded={justAdded}
            inStock={inStock}
            atMax={atMax}
            mainCTARef={mainCTARef}
            personalizacion={personalizacion}
            onPersonalizacionChange={setPersonalizacion}
            contactoEncargo={contactoEncargo}
            onContactoEncargoChange={setContactoEncargo}
            enviandoEncargo={enviandoEncargo}
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
            onComprarAhora={handleComprarAhora}
            atMax={atMax}
            inStock={inStock}
          />
        )}
      </AnimatePresence>

    </MainLayout>
  )
}
