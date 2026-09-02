import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useWishlistStore from '@/store/wishlistStore'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import ProductCardImage from '@/components/ui/productCard/ProductCardImage'
import ProductCardBody from '@/components/ui/productCard/ProductCardBody'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'
import { esProductoCotizable } from '@/utils/precioProducto'

type ProductCardProps = {
  product: Producto
  priority?: boolean
  index?: number
  hotTag?: string | null
}

function ProductCard({ product, priority = false, index = 0, hotTag = null }: ProductCardProps) {
  const navigate = useNavigate()
  const { toggle: toggleWishlist, isLiked } = useWishlistStore()
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()
  const { t } = useTranslation()
  const [imgError, setImgError] = useState(false)
  const [added, setAdded] = useState(false)

  const liked = isLiked(product.id as Id)
  let stockColor = 'var(--hc-success)'
  if (product.stock === 0) stockColor = 'var(--hc-danger)'
  else if (product.stock <= 3) stockColor = 'var(--hc-warning)'
  let stockText = t('products.inStock')
  if (product.stock === 0) stockText = t('products.outOfStock')
  else if (product.stock <= 3) stockText = t('products.lowStock', { count: product.stock })

  const handleAddToCart = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    if (esProductoCotizable(product)) {
      navigate(`/productos/${product.id}`, { state: { product } })
      return
    }
    if (product.stock === 0) return
    addItem(product)
    setAdded(true)
    toast({ message: t('product.added', { name: product.nombre }), type: 'success' })
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <motion.div
      initial={{ opacity: priority ? 1 : 0, y: priority ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: priority ? 0 : Math.min(index * 0.05, 0.32) }}
      whileHover={{ y: -6, transition: { duration: 0.2, ease: 'easeOut' } }}
      className="group hc-card hc-card-glow rounded-2xl overflow-hidden cursor-pointer"
      onClick={() => navigate(`/productos/${product.id}`, { state: { product } })}
    >
      <ProductCardImage
        product={product}
        priority={priority}
        imgError={imgError}
        setImgError={setImgError}
        hotTag={hotTag}
        liked={liked}
        onToggleWishlist={toggleWishlist}
      />

      <ProductCardBody
        product={product}
        stockColor={stockColor}
        stockText={stockText}
        added={added}
        onAddToCart={handleAddToCart}
      />
    </motion.div>
  )
}

// No usar memo aquí: el wishlistStore es externo y el componente
// ya usa selectores de Zustand que generan su propio re-render.
export default ProductCard
