import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'
import useWishlistStore from '@/store/wishlistStore'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'

export default function WishlistPage() {
  const navigate = useNavigate()
  const { items, remove } = useWishlistStore()
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()
  const [recentlyAdded, setRecentlyAdded] = useState(new Set())

  const handleAddToCart = (product) => {
    addItem(product)
    toast({ message: `${product.nombre} añadido al carrito`, type: 'success' })
    setRecentlyAdded((prev) => new Set([...prev, product.id]))
    setTimeout(() => {
      setRecentlyAdded((prev) => {
        const next = new Set(prev)
        next.delete(product.id)
        return next
      })
    }, 1400)
  }

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <span className="text-7xl select-none" style={{ opacity: 0.2 }}>♡</span>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">Tu wishlist está vacía</h1>
            <p className="text-[#8e8e9a]">Guarda tus productos favoritos para encontrarlos rápido.</p>
            <button
              onClick={() => navigate('/productos')}
              className="mt-2 px-6 py-2.5 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-medium text-sm transition-all"
            >
              Explorar productos
            </button>
          </motion.div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#e8e8ed]">Wishlist</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">
              {items.length} {items.length === 1 ? 'producto guardado' : 'productos guardados'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <AnimatePresence>
            {items.map((product, i) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className="group rounded-2xl overflow-hidden"
                style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
              >
                {/* Image */}
                <div
                  className="relative h-40 bg-[#1a1a1f] flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/productos/${product.id}`)}
                >
                  {product.imagenUrl ? (
                    <img
                      src={product.imagenUrl}
                      alt={product.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-4xl opacity-25">📦</span>
                  )}
                  {/* Remove heart */}
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(product.id) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center bg-black/45 hover:bg-red-500/30 transition-colors border border-white/10"
                    aria-label="Quitar de wishlist"
                  >
                    <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                </div>

                {/* Info */}
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => navigate(`/productos/${product.id}`)}
                >
                  <h3 className="font-medium text-xs leading-snug line-clamp-2 mb-1.5" style={{ color: 'var(--hc-text)' }}>
                    {product.nombre}
                  </h3>
                  <span className="font-bold text-sm text-[#4f7cff]">{formatPrice(product.precio)}</span>
                </div>

                {/* Add to cart */}
                <div className="px-3 pb-3">
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0}
                    className={`w-full h-8 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      product.stock === 0
                        ? 'bg-white/5 text-[#8e8e9a] cursor-not-allowed'
                        : recentlyAdded.has(product.id)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white'
                    }`}
                  >
                    {product.stock === 0
                      ? 'Sin stock'
                      : recentlyAdded.has(product.id)
                      ? '✓ Añadido'
                      : 'Agregar al carrito'}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  )
}
