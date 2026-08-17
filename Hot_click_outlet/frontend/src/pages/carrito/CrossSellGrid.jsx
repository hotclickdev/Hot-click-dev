import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { formatPrice } from '@/utils/format'
import { PackagePlaceholder } from './cartIcons'

function CrossSellCard({ product, added, onAdd, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="group rounded-2xl overflow-hidden"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <Link
        to={`/productos/${product.id}`}
        className="h-28 bg-[#1a1a1f] flex items-center justify-center overflow-hidden block"
      >
        {product.imagenUrl ? (
          <img
            src={product.imagenUrl}
            alt={product.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <PackagePlaceholder className="w-10 h-10 opacity-20" />
        )}
      </Link>
      <div className="p-3">
        <Link
          to={`/productos/${product.id}`}
          className="text-xs font-medium line-clamp-2 mb-1.5 block"
          style={{ color: 'var(--hc-text)' }}
        >
          {product.nombre}
        </Link>
        <p className="text-sm font-bold text-[#4f7cff] mb-2">{formatPrice(product.precio)}</p>
        <button
          onClick={() => onAdd(product)}
          className={`w-full h-7 rounded-lg text-xs font-medium transition-all duration-200 ${
            added
              ? 'bg-emerald-500 text-white'
              : 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white'
          }`}
        >
          {added ? '✓ Añadido' : '+ Agregar'}
        </button>
      </div>
    </motion.div>
  )
}

function EncabezadoVacio() {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-px flex-1" style={{ background: 'var(--hc-border)' }} />
      <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--hc-muted)' }}>
        Te puede interesar
      </h2>
      <div className="h-px flex-1" style={{ background: 'var(--hc-border)' }} />
    </div>
  )
}

function EncabezadoLleno() {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-lg font-semibold text-[#e8e8ed]">Completa tu compra</h2>
      <span className="text-xs text-[#8e8e9a]">Productos que podrían interesarte</span>
    </div>
  )
}

export default function CrossSellGrid({ products, addedIds, onAdd, variant = 'lleno' }) {
  if (!products.length) return null
  const delayBase = variant === 'vacio' ? 0.3 : 0
  const grid = (
    <>
      {variant === 'vacio' ? <EncabezadoVacio /> : <EncabezadoLleno />}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {products.map((product, index) => (
          <CrossSellCard
            key={product.id}
            product={product}
            added={addedIds.has(product.id)}
            onAdd={onAdd}
            delay={delayBase + index * 0.08}
          />
        ))}
      </div>
    </>
  )
  if (variant === 'vacio') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="mt-14"
      >
        {grid}
      </motion.div>
    )
  }
  return <div className="mt-5 sm:mt-10">{grid}</div>
}
