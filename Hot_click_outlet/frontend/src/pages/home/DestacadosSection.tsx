import { useTranslation } from 'react-i18next'
import ProductCard from '@/components/ui/ProductCard'
import Section from '@/components/ui/Section'
import type { Producto } from '@/types/producto'

/**
 * Grilla de productos destacados en la home.
 */
export default function DestacadosSection({ destacados = [] }: { destacados?: Producto[] }) {
  const { t } = useTranslation()
  if (destacados.length === 0) return null
  return (
    <Section
      title={`${t('home.destacados')}.`}
      subtitle={t('home.destacadosTeaser')}
      action={{ label: t('home.verTodos'), to: '/productos' }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {destacados.map((product, i) => (
          <ProductCard key={product.id} product={product} priority={i < 2} index={i} />
        ))}
      </div>
    </Section>
  )
}
