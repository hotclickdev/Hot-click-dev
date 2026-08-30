import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getOptimizedUrl } from '@/utils/imageUtils'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'
import { PackagePlaceholder } from './productIcons'

function BrandProductCard({
  producto, delay, onOpen,
}: {
  producto: Producto
  delay: number
  onOpen: (id: Id | undefined) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
      onClick={() => onOpen(producto.id)}
      className="group shrink-0 cursor-pointer relative rounded-2xl overflow-hidden"
      style={{ width: 140, height: 140, background: 'var(--hc-surface-2)' }}
    >
      {producto.imagenUrl ? (
        <img
          src={getOptimizedUrl(producto.imagenUrl, { width: 140 })}
          alt={producto.nombre}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
          loading="lazy"
        />
      ) : (
        <span className="flex items-center justify-center w-full h-full opacity-20">
          <PackagePlaceholder className="w-10 h-10" />
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 py-2 px-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
        style={{ background: 'rgba(0,0,0,0.72)' }}>
        <p className="text-[10px] text-white font-medium line-clamp-2 leading-tight">{producto.nombre}</p>
      </div>
    </motion.div>
  )
}

export default function BrandProductsRow({ product, brandProducts }: { product: Producto; brandProducts: Producto[] }) {
  const navigate = useNavigate()
  if (brandProducts.length === 0) return null

  const marcaHref = `/productos?marcaId=${product.marcaId}&marcaNombre=${encodeURIComponent(product.marcaNombre)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="mt-8 sm:mt-16"
    >
      <div className="flex flex-col items-center gap-3 mb-6">
        {product.marcaLogoUrl ? (
          <img
            src={product.marcaLogoUrl}
            alt={product.marcaNombre}
            className="h-14 w-auto object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <span className="text-2xl font-black tracking-tight" style={{ color: 'var(--hc-text)' }}>
            {product.marcaNombre}
          </span>
        )}
        <button
          type="button"
          onClick={() => navigate(marcaHref)}
          className="text-[11px] font-semibold px-4 py-1 rounded-full border transition-opacity hover:opacity-70"
          style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}
        >
          Ver todos los productos
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {brandProducts.map((bp, i) => (
          <BrandProductCard
            key={bp.id}
            producto={bp}
            delay={i * 0.05}
            onOpen={(id) => navigate(`/productos/${id}`)}
          />
        ))}
      </div>
    </motion.div>
  )
}
