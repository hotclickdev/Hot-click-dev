import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ProductCard from '@/components/ui/ProductCard'
import type { Producto } from '@/types/producto'

type DescubriResultadosProps = {
  products: Producto[]
  onChangeGustos: () => void
}

/** Grilla de productos filtrados por gustos + vacíos / CTA al catálogo. */
export default function DescubriResultados({ products, onChangeGustos }: DescubriResultadosProps) {
  const { t } = useTranslation()

  if (products.length === 0) {
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
            onClick={onChangeGustos}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--hc-accent)' }}
          >
            {t('descubri.changeGustos')}
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
          onClick={onChangeGustos}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl shrink-0"
          style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
        >
          {t('descubri.changeGustos')}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} index={i} />
        ))}
      </div>

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
