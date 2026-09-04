import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import ProductCard from '@/components/ui/ProductCard'
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

/** Grilla de productos recomendados + negocios del swipe. */
export default function DescubriResultados({
  products,
  negocios,
  onSeguirDescubriendo,
}: DescubriResultadosProps) {
  const { t } = useTranslation()

  if (products.length === 0 && negocios.length === 0) {
    return (
      <div role="status" className="text-center py-12">
        <p className="font-semibold text-base mb-1" style={{ color: 'var(--hc-text)' }}>
          {t('descubri.emptyTitle')}
        </p>
        <p className="text-sm mb-6" style={{ color: 'var(--hc-muted)' }}>
          {t('descubri.emptySub')}
        </p>
        <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
          <button
            type="button"
            onClick={onSeguirDescubriendo}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--hc-accent)' }}
          >
            {t('descubri.keepSwiping')}
          </button>
          <Link
            to="/productos"
            className="w-full py-3 rounded-xl text-sm font-semibold text-center"
            style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
          >
            {t('descubri.backToCatalog')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          {t('descubri.resultsCount', { count: products.length })}
        </p>
        <button
          type="button"
          onClick={onSeguirDescubriendo}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl shrink-0"
          style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
        >
          {t('descubri.keepSwiping')}
        </button>
      </div>

      {products.length > 0 && (
        <section className="mb-10" aria-labelledby="descubri-productos-titulo">
          <h2
            id="descubri-productos-titulo"
            className="text-sm font-semibold mb-3"
            style={{ color: 'var(--hc-text)' }}
          >
            {t('descubri.productsForYou')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} index={i} />
            ))}
          </div>
        </section>
      )}

      {negocios.length > 0 && (
        <section className="mb-10" aria-labelledby="descubri-negocios-titulo">
          <h2
            id="descubri-negocios-titulo"
            className="text-sm font-semibold mb-1"
            style={{ color: 'var(--hc-text)' }}
          >
            {t('descubri.businessesTitle')}
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--hc-muted)' }}>
            {t('descubri.businessesSub')}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {negocios.map((n, i) => (
              <motion.li
                key={n.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.25) }}
              >
                <Link
                  to={`/tienda/${n.slug}`}
                  className="flex items-center gap-3 p-4 rounded-2xl min-h-11 transition-colors"
                  style={{
                    background: 'var(--hc-surface)',
                    border: '1px solid var(--hc-border)',
                  }}
                >
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                    style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-text)' }}
                    aria-hidden="true"
                  >
                    {n.nombre.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate" style={{ color: 'var(--hc-text)' }}>
                      {n.nombre}
                    </span>
                    <span className="block text-xs" style={{ color: 'var(--hc-accent)' }}>
                      {t('descubri.visitStore')}
                    </span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-col sm:flex-row gap-2.5 justify-center">
        <Link
          to="/productos?sort=para_vos"
          className="px-5 py-3 rounded-xl text-sm font-semibold text-center text-white"
          style={{ background: 'var(--hc-accent)' }}
        >
          {t('descubri.catalogByTaste')}
        </Link>
        <Link
          to="/productos"
          className="px-5 py-3 rounded-xl text-sm font-semibold text-center"
          style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
        >
          {t('descubri.backToCatalog')}
        </Link>
      </div>
    </div>
  )
}
