import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_DESCUBRI } from './iconosDescubri'
import ProductCard from '@/components/comprador/ProductCard'
import type { Producto } from '@/types/producto'

export type NegocioRecomendado = {
  slug: string
  nombre: string
}

type DescubriResultadosProps = {
  products: Producto[]
  negocios: NegocioRecomendado[]
  onSeguirDescubriendo: () => void
}

const CLASE_PRIMARIO = 'flex items-center justify-center rounded-[12px] bg-hc-red-500 px-5 py-[14px] text-[15px] font-semibold leading-[18px] text-hc-n-0'
const CLASE_SECUNDARIO = 'flex items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-5 py-[13px] text-[15px] font-semibold leading-[18px] text-hc-n-900'

/**
 * Grilla de productos recomendados + negocios del swipe (derivado de Figma: encabezados Sora de `26:722`,
 * tarjetas de producto del catálogo y filas claras del directorio `29:1159`).
 */
export default function DescubriResultados({
  products,
  negocios,
  onSeguirDescubriendo,
}: DescubriResultadosProps) {
  const { t } = useTranslation()

  if (products.length === 0 && negocios.length === 0) {
    return (
      <EstadoVacio
        icono={<IconoFigma src={ICONOS_DESCUBRI.meGusta25} size={28} />}
        tono="rojo"
        titulo={t('descubri.emptyTitle')}
        texto={t('descubri.emptySub')}
        accion={{ texto: t('descubri.keepSwiping'), onClick: onSeguirDescubriendo }}
        secundaria={{ texto: t('descubri.backToCatalog'), to: '/productos' }}
      />
    )
  }

  return (
    <div className="leading-[normal]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[13px] text-hc-n-600">
          {t('descubri.resultsCount', { count: products.length })}
        </p>
        <button
          type="button"
          onClick={onSeguirDescubriendo}
          className="shrink-0 rounded-full border border-hc-n-200 bg-hc-n-0 px-3 py-[7px] text-[13px] font-semibold text-hc-n-900"
        >
          {t('descubri.keepSwiping')}
        </button>
      </div>

      {products.length > 0 && (
        <section className="mb-8" aria-labelledby="descubri-productos-titulo">
          <h2 id="descubri-productos-titulo" className="mb-3 font-display text-[17px] font-bold text-hc-n-900">
            {t('descubri.productsForYou')}
          </h2>
          <div className="grid grid-cols-[repeat(2,minmax(0,167px))] justify-between gap-y-4 sm:grid-cols-[repeat(auto-fill,167px)] sm:justify-start sm:gap-x-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>
        </section>
      )}

      {negocios.length > 0 && (
        <section className="mb-8" aria-labelledby="descubri-negocios-titulo">
          <h2 id="descubri-negocios-titulo" className="font-display text-[17px] font-bold text-hc-n-900">
            {t('descubri.businessesTitle')}
          </h2>
          <p className="mb-3 mt-1 text-[13px] text-hc-n-600">
            {t('descubri.businessesSub')}
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {negocios.map((n) => (
              <li key={n.slug}>
                <Link
                  to={`/tienda/${n.slug}`}
                  className="flex min-h-11 items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-3"
                >
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-hc-n-100 font-display text-[15px] font-bold text-hc-n-900"
                    aria-hidden="true"
                  >
                    {n.nombre.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-hc-n-900">{n.nombre}</span>
                    <span className="block text-[12px] font-semibold text-hc-blue-600">{t('descubri.visitStore')}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
        <Link to="/productos?sort=para_vos" className={CLASE_PRIMARIO}>
          {t('descubri.catalogByTaste')}
        </Link>
        <Link to="/productos" className={CLASE_SECUNDARIO}>
          {t('descubri.backToCatalog')}
        </Link>
      </div>
    </div>
  )
}
