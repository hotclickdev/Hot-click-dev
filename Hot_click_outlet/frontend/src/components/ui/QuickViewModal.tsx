import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import { useToast } from '@/components/ui/Toast'
import { analytics } from '@/utils/analytics'
import QuickViewInfo from '@/components/ui/quickView/QuickViewInfo'
import QuickViewActions from '@/components/ui/quickView/QuickViewActions'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'

type QuickViewModalProps = {
  product: Producto
  onClose: () => void
}

export default function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [justAdded, setJustAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const { toggle, isLiked } = useWishlistStore()
  const toast = useToast()
  const addTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const liked = isLiked(product.id as Id)
  const inStock = product.stock > 0
  const atMax = quantity >= (product.stock ?? 99)

  useEffect(() => { analytics.quickViewOpen(product) }, [])

  useEffect(() => () => clearTimeout(addTimeout.current ?? undefined), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleAdd = () => {
    if (!inStock || justAdded) return
    for (let i = 0; i < quantity; i++) addItem(product)
    const qtyPrefix = quantity > 1 ? `${quantity}× ` : ''
    toast({ message: `${qtyPrefix}${product.nombre} ${t('quickView.addedToast')}`, type: 'success' })
    setJustAdded(true)
    addTimeout.current = setTimeout(() => setJustAdded(false), 1400)
  }

  const handleComprarAhora = () => {
    if (!inStock) return
    if (!justAdded) {
      for (let i = 0; i < quantity; i++) addItem(product)
    }
    onClose()
    navigate('/checkout')
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        role="presentation"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          className="pointer-events-auto w-full md:max-w-[680px] md:mx-4 rounded-t-3xl md:rounded-2xl overflow-hidden"
          style={{
            background: 'var(--hc-surface)',
            border: '1px solid var(--hc-border)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
        >
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          <div className="flex flex-col md:flex-row max-h-[85vh] md:max-h-[520px] overflow-y-auto md:overflow-hidden">
            <QuickViewInfo product={product} inStock={inStock} onClose={onClose}>
              <QuickViewActions
                product={product}
                inStock={inStock}
                quantity={quantity}
                setQuantity={setQuantity}
                atMax={atMax}
                liked={liked}
                toggle={toggle}
                handleAdd={handleAdd}
                handleComprarAhora={handleComprarAhora}
                justAdded={justAdded}
                onClose={onClose}
              />
            </QuickViewInfo>
          </div>
        </motion.div>
      </div>
    </>
  )
}
