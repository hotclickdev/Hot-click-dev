import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useCartStore from '@/store/cartStore'
import useRecentlyViewedStore from '@/store/recentlyViewedStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'
import { getOptimizedUrl } from '@/utils/imageUtils'
import Section from '@/components/ui/Section'
import TrustGlyph from '@/components/ui/TrustGlyph'
import type { ItemVisto } from '@/types/carrito'
import type { Producto } from '@/types/producto'

function RecentlyViewedCard({ product, onAdd }: { product: ItemVisto; onAdd: (product: ItemVisto) => void }) {
  return (
    <motion.article
      role="listitem"
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="shrink-0 w-36 rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <Link
        to={`/productos/${product.id}`}
        aria-hidden="true"
        tabIndex={-1}
        className="block w-full h-28 bg-gray-50 flex items-center justify-center overflow-hidden"
        style={{ background: 'var(--hc-bg)' }}
      >
        {product.imagenUrl ? (
          <img
            src={getOptimizedUrl(product.imagenUrl, { width: 160, quality: 80 })}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            width={144}
            height={112}
          />
        ) : (
          <span aria-hidden="true" className="opacity-30" style={{ color: 'var(--hc-muted)' }}>
            <TrustGlyph tipo="paquete" className="w-10 h-10" />
          </span>
        )}
      </Link>
      <div className="flex flex-col flex-1 px-3 pt-2 pb-3 gap-1">
        <Link
          to={`/productos/${product.id}`}
          aria-label={`Ver ${product.nombre}, ${formatPrice(product.precio)}`}
          className="flex-1"
        >
          <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: 'var(--hc-muted)' }}>{product.nombre}</p>
          <p className="text-sm font-bold mt-1" style={{ color: 'var(--hc-text)' }}>{formatPrice(product.precio)}</p>
        </Link>
        <div className="flex justify-end mt-1">
          <motion.button
            whileTap={{ scale: 0.88 }}
            aria-label={`Agregar ${product.nombre} al pedido`}
            onClick={() => onAdd(product)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-base font-bold shadow"
            style={{ background: 'var(--hc-accent)' }}
          >+</motion.button>
        </div>
      </div>
    </motion.article>
  )
}

/** Carrusel horizontal de productos vistos recientemente. */
export default function RecentlyViewedSection() {
  const { t } = useTranslation()
  const toast = useToast()
  const addItem = useCartStore((s) => s.addItem)
  const recentlyViewed = useRecentlyViewedStore((s) => s.items)

  if (recentlyViewed.length === 0) return null

  const handleAdd = (product: ItemVisto) => {
    addItem(product as unknown as Producto)
    toast({ message: t('product.added', { name: product.nombre }), type: 'success' })
  }

  return (
    <Section title={`${t('home.recentlyViewed')}.`} subtitle="Seguí donde lo dejaste.">
      <div role="list" className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide px-1">
        {recentlyViewed.map((p) => (
          <RecentlyViewedCard key={p.id} product={p} onAdd={handleAdd} />
        ))}
      </div>
    </Section>
  )
}
