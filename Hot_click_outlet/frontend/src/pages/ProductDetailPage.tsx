import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Spinner from '@/components/ui/Spinner'
import {
  esProductoCotizable, parecidosDisponibles, parseTallas, seoDesdeProducto, tabsDesdeProducto,
} from './producto/productoHelpers'
import ProductBreadcrumb from './producto/ProductBreadcrumb'
import ProductGallery from './producto/ProductGallery'
import ProductInfo from './producto/ProductInfo'
import ProductTabs from './producto/ProductTabs'
import CarruselProductos from './producto/CarruselProductos'
import OpinionesProducto from './producto/OpinionesProducto'
import RecentlyViewedGrid from './producto/RecentlyViewedGrid'
import ProductDetailSeo from './producto/ProductDetailSeo'
import { useProductDetail } from './producto/useProductDetail'
import HojaAgregadoAlPedido from '@/components/comprador/HojaAgregadoAlPedido'
import { Helmet } from 'react-helmet-async'

export default function ProductDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const {
    product, loading, quantity, activeTab, setActiveTab, justAdded, hojaAgregadoAbierta, setHojaAgregadoAbierta,
    recommendations, galeria, activeImg, setActiveImg,
    variantes, tallaSeleccionada, setTallaSeleccionada, mainCTARef,
    recentlyViewed, inStock, atMax, handleDecrease, handleIncrease, handleAdd,
    personalizacion, setPersonalizacion, contactoEncargo, setContactoEncargo, enviandoEncargo,
    turnstileRef, setTurnstileToken, turnstileSiteKey, turnstileBloqueaSubmit,
  } = useProductDetail(id, t)

  // Figma 28:839: la ficha dibuja su propia barra (atrás, compartir, favorito sobre la foto) y una barra
  // de compra fija, así que no lleva barra superior ni inferior en móvil. En desktop usa el header completo.
  const layout = { variante: 'propia', barraInferior: false, encabezadoEscritorio: 'completo' } as const

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
          <h1 className="text-2xl font-bold text-hc-n-900">
            {t('product.notFound')}
          </h1>
          <p className="text-sm text-hc-n-600">
            {t('notFound.subtitle')}
          </p>
          <Link
            to="/productos"
            className="inline-flex items-center justify-center rounded-xl bg-hc-red-500 px-5 py-2.5 text-sm font-semibold text-hc-n-0"
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
  // Ficha agotada: las recomendaciones con stock suben a "Parecidos disponibles" (Figma 44:1965).
  const agotado = !inStock && !esProductoCotizable(product)
  const parecidos = agotado ? parecidosDisponibles(recommendations, product.id) : []
  // Frames de estado (44:1775, 44:1849, 44:1917): galería de 360 px y cabecera compacta.
  const compacta = agotado
    || product.esPersonalizado === true
    || parseTallas(product.talla).length > 0
    || variantes.length > 0
    || Boolean(product.colorVariante)

  return (
    <MainLayout {...layout}>
      <ProductDetailSeo product={product} seoTitle={seoTitle} seoDescription={seoDescription} />
      <div className="bg-hc-n-0 pb-[83px] lg:bg-transparent lg:pb-0">
        <div className="lg:mx-auto lg:w-[calc(100%-4rem)] lg:max-w-[1200px] lg:pt-5">
          <ProductBreadcrumb product={product} />

          <div className="lg:mt-5 lg:grid lg:grid-cols-[minmax(0,644px)_minmax(360px,1fr)] lg:items-start lg:gap-12 lg:pb-10">
            <ProductGallery
              product={product}
              galeria={galeria}
              activeImg={activeImg}
              onSelectImg={setActiveImg}
              compacta={compacta}
              cubierta={agotado}
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
              personalizacion={personalizacion}
              onPersonalizacionChange={setPersonalizacion}
              contactoEncargo={contactoEncargo}
              onContactoEncargoChange={setContactoEncargo}
              enviandoEncargo={enviandoEncargo}
              turnstileSiteKey={turnstileSiteKey}
              turnstileRef={turnstileRef}
              setTurnstileToken={setTurnstileToken}
              turnstileBloqueaSubmit={turnstileBloqueaSubmit}
              compacta={compacta}
            />
          </div>
        </div>

        <div className="lg:mx-auto lg:w-[calc(100%-4rem)] lg:max-w-[1200px]">
          {!agotado && <OpinionesProducto productoId={product.id} />}

          {agotado ? (
            <CarruselProductos
              id="parecidos-disponibles"
              titulo={t('product.parecidosDisponibles')}
              productos={parecidos}
              variante="contenido"
            />
          ) : (
            <CarruselProductos
              id="recomendados-producto"
              titulo={t('product.youMayLike')}
              productos={recommendations}
              variante="sangrado"
            />
          )}

          <div className="px-4 lg:px-0">
            <ProductTabs product={product} tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          <div className="px-4 lg:px-0">
            <RecentlyViewedGrid items={recentlyViewed} currentProductId={product.id} />
          </div>
        </div>
      </div>
      <HojaAgregadoAlPedido
        abierta={hojaAgregadoAbierta}
        onCerrar={() => setHojaAgregadoAbierta(false)}
        producto={product}
        cantidad={quantity}
      />
    </MainLayout>
  )
}
