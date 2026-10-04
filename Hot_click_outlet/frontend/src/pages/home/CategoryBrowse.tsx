import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Section from '@/components/ui/Section'
import TrustGlyph from '@/components/ui/TrustGlyph'
import TextoFlecha from '@/components/ui/TextoFlecha'
import { agruparPorCategoria, type CategoriaBrowse, type ProductoMuestraCategoria } from './categoryBrowseGrupos'
import { useSlugsSector } from '@/pages/seo/useSlugsSector'

// ─── Sección "Explorar por categoría" estilo Amazon ──────────────────────────
export default function CategoryBrowse({
  products,
  categories,
  visibleCategoryIds,
  maxCategories = 8,
}: {
  products: ProductoMuestraCategoria[]
  categories: CategoriaBrowse[]
  /** IDs fijados desde la config del homepage. Vacío/ausente = automático por cantidad de productos. */
  visibleCategoryIds?: string[]
  maxCategories?: number
}) {
  const { t } = useTranslation()
  const slugsSector = useSlugsSector()
  const catGroups = useMemo(
    () => agruparPorCategoria(products, categories, visibleCategoryIds, maxCategories),
    [products, categories, visibleCategoryIds, maxCategories],
  )

  if (catGroups.length === 0) return null

  return (
    <Section
      title={t('home.browseTitle')}
      subtitle={t('home.browseSub')}
      action={{ label: t('home.fullCatalog'), to: '/productos' }}
      tone="surface"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {catGroups.map((group, gi) => (
          <motion.div
            key={group.catId}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: gi * 0.06 }}
          >
            <Link
              to={group.slug && slugsSector.has(group.slug) ? `/comprar/${group.slug}` : `/productos?cat=${group.catId}`}
              className="block rounded-2xl overflow-hidden transition-all hover:shadow-lg group"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              {/* Título */}
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-sm font-bold line-clamp-1 group-hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--hc-text)' }}>
                  {group.nombre}
                </h3>
              </div>

              {/* Grid 2×2 de imágenes de productos */}
              <div className="grid grid-cols-2 gap-px p-2 pt-1">
                {Array.from({ length: 4 }).map((_, i) => {
                  const prod = group.products[i]
                  return (
                    <div key={i} className="aspect-square overflow-hidden rounded-xl"
                      style={{ background: 'color-mix(in srgb, var(--hc-text) 4%, transparent)' }}>
                      {prod?.imagenUrl ? (
                        <img
                          src={prod.imagenUrl}
                          alt={prod.nombre ?? ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-30" style={{ color: 'var(--hc-muted)' }}>
                          <TrustGlyph tipo="paquete" className="w-7 h-7" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-3">
                <span className="text-xs font-semibold transition-opacity group-hover:opacity-60"
                  style={{ color: 'var(--hc-accent)' }}>
                  <TextoFlecha>{t('products.viewResults', { count: group.products.length })}</TextoFlecha>
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </Section>
  )
}
