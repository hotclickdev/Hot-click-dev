import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Spinner from '@/components/ui/Spinner'
import { abandonedCartService } from '@/services/abandonedCartService'
import useCartStore from '@/store/cartStore'
import { formatPrice } from '@/utils/format'
import { useToast } from '@/components/ui/Toast'

export default function RecuperarCarritoPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const toast   = useToast()

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [adding,  setAdding]  = useState(false)

  useEffect(() => {
    abandonedCartService.getAbandonedCart(id)
      .then(({ data }) => {
        const list = data?.data?.items ?? []
        setItems(list)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  const total = items.reduce(
    (sum, i) => sum + (i.precio ?? 0) * (i.cantidad ?? 1), 0
  )

  const handleRestore = async () => {
    setAdding(true)
    items.forEach((item) =>
      addItem({
        id:        item.productoId,
        nombre:    item.nombre,
        precio:    item.precio,
        imagenUrl: item.imagenUrl,
        stock:     99,
        cantidad:  item.cantidad,
      })
    )
    try { await abandonedCartService.deleteAbandonedCart(id) } catch { /* ok */ }
    toast({ message: t('recuperarCarrito.addedToast', { count: items.length }), type: 'success' })
    navigate('/carrito')
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  if (error || items.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <p className="text-4xl mb-4">🛒</p>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--hc-text)' }}>
            {t('recuperarCarrito.notAvailable')}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--hc-muted)' }}>
            {t('recuperarCarrito.expired')}
          </p>
          <button type="button"
            onClick={() => navigate('/productos')}
            className="hc-btn hc-btn-primary"
          >
            {t('recuperarCarrito.viewProducts')}
          </button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-5xl">🛒</span>
            <h1 className="text-2xl font-bold mt-3 mb-1" style={{ color: 'var(--hc-text)' }}>
              {t('recuperarCarrito.title')}
            </h1>
            <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
              {t('recuperarCarrito.subtitle')}
            </p>
          </div>

          {/* Product list */}
          <div
            className="rounded-2xl overflow-hidden mb-6"
            style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
          >
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < items.length - 1 ? '1px solid var(--hc-border)' : 'none' }}
              >
                {item.imagenUrl ? (
                  <img
                    src={item.imagenUrl}
                    alt={item.nombre}
                    width={52}
                    height={52}
                    loading="lazy"
                    className="rounded-xl object-cover shrink-0"
                    style={{ background: 'var(--hc-bg)' }}
                  />
                ) : (
                  <div
                    className="w-13 h-13 rounded-xl shrink-0 flex items-center justify-center text-xl"
                    style={{ background: 'var(--hc-bg)', width: 52, height: 52 }}
                  >
                    📦
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--hc-text)' }}>
                    {item.nombre}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                    {t('recuperarCarrito.quantity')} {item.cantidad ?? 1}
                  </p>
                </div>
                <span className="font-semibold text-sm shrink-0" style={{ color: 'var(--hc-text)' }}>
                  {formatPrice((item.precio ?? 0) * (item.cantidad ?? 1))}
                </span>
              </div>
            ))}

            {/* Total */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: '2px solid var(--hc-border)' }}
            >
              <span className="font-semibold text-sm" style={{ color: 'var(--hc-muted)' }}>{t('recuperarCarrito.total')}</span>
              <span className="font-bold text-base" style={{ color: 'var(--hc-text)' }}>
                {formatPrice(total)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button type="button"
              onClick={handleRestore}
              disabled={adding}
              className="hc-btn hc-btn-primary w-full h-12 text-sm font-bold disabled:opacity-60"
            >
              {adding ? t('recuperarCarrito.adding') : t('recuperarCarrito.restore')}
            </button>
            <button type="button"
              onClick={() => navigate('/productos')}
              className="hc-btn hc-btn-ghost w-full h-10 text-sm"
              style={{ color: 'var(--hc-muted)' }}
            >
              {t('recuperarCarrito.exploreNew')}
            </button>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  )
}
