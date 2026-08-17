import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import { highlight } from './searchPanelHighlight'

export function SearchPanelBody({
  query,
  loading,
  recent,
  brandResults,
  productResults,
  brandProductCount,
  hasResults,
  selectBrand,
  selectProduct,
  viewAll,
  clearRecent,
  setQuery,
}) {
  const { t } = useTranslation()

  return (
    <div className="overflow-y-auto flex-1">

      {!query && recent.length > 0 && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>
              {t('search.recent')}
            </span>
            <button onClick={clearRecent} className="text-xs text-[#4f7cff] hover:underline">{t('search.clearRecent')}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-colors hover:bg-white/5"
                style={{ color: 'var(--hc-text)', borderColor: 'var(--hc-border)' }}
              >
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--hc-muted)' }}>
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-3.46" />
                </svg>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {!query && recent.length === 0 && !loading && (
        <div className="py-12 text-center">
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('search.typeToSearch')}</p>
        </div>
      )}

      {query.trim() && (
        <>
          {!hasResults && !loading && (
            <div className="py-12 text-center px-6">
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--hc-text)' }}>
                {t('search.noResults')} "{query}"
              </p>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                {t('search.noResultsSub')}
              </p>
              <button
                onClick={viewAll}
                className="mt-4 px-5 py-2 rounded-xl text-sm border transition-colors hover:bg-white/5"
                style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}
              >
                {t('search.viewAll')}
              </button>
            </div>
          )}

          {brandResults.length > 0 && (
            <div>
              <div className="px-4 pt-4 pb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>
                  {t('search.brandSection')}
                </span>
              </div>
              {brandResults.map((brand, i) => {
                const count = brandProductCount[brand.id] ?? 0
                return (
                  <motion.button
                    key={brand.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => selectBrand(brand)}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {brand.logoUrl ? (
                        <img src={brand.logoUrl} alt={brand.nombreMarca} className="w-full h-full object-contain p-1.5" onError={(e) => { e.target.style.display = 'none' }} />
                      ) : (
                        <span className="text-xs font-bold uppercase" style={{ color: 'var(--hc-accent)' }}>
                          {brand.nombreMarca?.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>
                        {highlight(brand.nombreMarca, query.trim())}
                      </p>
                      {count > 0 && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                          {count} {t('search.item', { count })}
                        </p>
                      )}
                    </div>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--hc-muted)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.button>
                )
              })}
            </div>
          )}

          {brandResults.length > 0 && productResults.length > 0 && (
            <div className="mx-4 border-t" style={{ borderColor: 'var(--hc-border)' }} />
          )}

          {productResults.length > 0 && (
            <div>
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>
                  {t('search.productsSection')}
                </span>
              </div>

              {productResults.map((product, i) => (
                <motion.button
                  key={product.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (brandResults.length + i) * 0.035 }}
                  onClick={() => selectProduct(product)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#1a1a1f] flex items-center justify-center overflow-hidden shrink-0 border border-white/8">
                    {product.imagenUrl ? (
                      <img src={product.imagenUrl} alt={product.nombre} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-xl opacity-25">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--hc-text)' }}>
                      {highlight(product.nombre, query.trim())}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {product.marcaNombre && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(140,92,246,0.12)', color: 'var(--hc-accent)' }}>
                          {product.marcaNombre}
                        </span>
                      )}
                      {product.categoriaNombre && (
                        <span className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>
                          {product.categoriaNombre}
                        </span>
                      )}
                      <span className={`text-[10px] font-medium flex items-center gap-1 ${product.stock === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        <span className={`w-1 h-1 rounded-full ${product.stock === 0 ? 'bg-red-400' : 'bg-emerald-400'}`} />
                        {product.stock === 0 ? t('search.outOfStock') : t('search.inStock')}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-[#4f7cff] shrink-0">
                    {formatPrice(product.precio)}
                  </span>
                </motion.button>
              ))}

              <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--hc-border)' }}>
                <button
                  onClick={viewAll}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
                  style={{ background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 25%, transparent)' }}
                >
                  {t('search.viewAllFor')} "{query}" →
                </button>
              </div>
            </div>
          )}

          {brandResults.length > 0 && productResults.length === 0 && (
            <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--hc-border)' }}>
              <button
                onClick={viewAll}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
                style={{ background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 25%, transparent)' }}
              >
                {t('search.viewAll')} →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
