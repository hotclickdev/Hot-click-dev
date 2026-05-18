import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Button from '@/components/ui/Button'
import ShippingProgress from '@/components/ui/ShippingProgress'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { formatPrice } from '@/utils/format'
import { useToast } from '@/components/ui/Toast'

const WHATSAPP = '50689745370'

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, total, toWhatsAppMessage } = useCartStore()
  const { token } = useAuthStore()
  const navigate  = useNavigate()
  const toast     = useToast()
  const { t } = useTranslation()

  const handleWhatsApp = () => {
    if (items.length === 0) return
    const msg = toWhatsAppMessage()
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
  }

  const handleCotizacion = () => {
    if (items.length === 0) return
    const lines = items.map((i) => `• ${i.nombre} ×${i.cantidad} — ${formatPrice(i.precio * i.cantidad)}`)
    const text = encodeURIComponent(
      `Hola HOTCLICK, quisiera solicitar una *cotización formal* para los siguientes productos:\n\n` +
      lines.join('\n') +
      `\n\nTotal estimado: ${formatPrice(total())}\n\n¿Pueden confirmarme disponibilidad, tiempo de entrega y métodos de pago? Gracias.`
    )
    window.open(`https://wa.me/${WHATSAPP}?text=${text}`, '_blank')
  }

  const handleRemove = (item) => {
    removeItem(item.id)
    toast({ message: t('cart.removed', { name: item.nombre }), type: 'info' })
  }

  const handleClear = () => {
    clearCart()
    toast({ message: t('cart.cleared'), type: 'info' })
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
            <span className="text-7xl opacity-20">🛍</span>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('cart.empty')}</h1>
            <p className="text-[#8e8e9a]">{t('cart.emptySub')}</p>
            <Link
              to="/productos"
              className="mt-2 px-6 py-2.5 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-medium text-sm transition-all"
            >
              {t('cart.explore')}
            </Link>
          </motion.div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#e8e8ed]">{t('cart.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">
              {items.length} {items.length === 1 ? t('cart.product') : t('cart.products')}
            </p>
          </div>
          <button
            onClick={handleClear}
            className="text-sm text-[#8e8e9a] hover:text-red-400 transition-colors"
          >
            {t('cart.clear')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items list */}
          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-4 p-4 bg-[#111114] border border-white/8 rounded-2xl"
                >
                  {/* Image */}
                  <div className="w-20 h-20 rounded-xl bg-[#1a1a1f] flex items-center justify-center shrink-0 overflow-hidden">
                    {item.imagenUrl ? (
                      <img src={item.imagenUrl} alt={item.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl opacity-30">📦</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[#e8e8ed] text-sm leading-snug truncate">
                      {item.nombre}
                    </h3>
                    <p className="text-[#4f7cff] font-semibold text-sm mt-1">
                      {formatPrice(item.precio)}
                    </p>

                    {/* Quantity */}
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                          aria-label={`Reducir cantidad de ${item.nombre}`}
                          className="w-8 h-8 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/8 rounded-md transition-colors text-sm"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-[#e8e8ed]">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                          disabled={item.cantidad >= (item.stock ?? 99)}
                          aria-label={`Aumentar cantidad de ${item.nombre}`}
                          className="w-8 h-8 flex items-center justify-center text-[#8e8e9a] hover:text-white hover:bg-white/8 rounded-md transition-colors text-sm disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemove(item)}
                        className="text-xs text-[#8e8e9a] hover:text-red-400 transition-colors"
                      >
                        {t('cart.remove')}
                      </button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#e8e8ed] text-sm">
                      {formatPrice(item.precio * item.cantidad)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky top-24 bg-[#111114] border border-white/8 rounded-2xl p-6 space-y-4"
            >
              <h2 className="font-semibold text-[#e8e8ed]">{t('cart.summary')}</h2>

              <div className="space-y-2 text-sm">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-[#8e8e9a]">
                    <span className="truncate mr-2">{item.nombre} ×{item.cantidad}</span>
                    <span className="shrink-0">{formatPrice(item.precio * item.cantidad)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-white/8 flex justify-between font-bold text-[#e8e8ed]">
                <span>{t('cart.total')}</span>
                <span className="text-lg">{formatPrice(total())}</span>
              </div>

              <ShippingProgress total={total()} />

              <div className="pt-2 space-y-2">
                {/* Pago con tarjeta vía PayXpert */}
                <Button
                  onClick={() => token ? navigate('/checkout') : navigate('/login')}
                  className="w-full bg-[#4f7cff] hover:bg-[#3d6ee0] shadow-[0_0_20px_rgba(79,124,255,0.3)]"
                  size="lg"
                >
                  <LockIcon />
                  {t('cart.payCard')}
                </Button>

                <Button
                  onClick={handleWhatsApp}
                  className="w-full bg-[#25D366] hover:bg-[#1da851] shadow-[0_0_20px_rgba(37,211,102,0.25)]"
                  size="lg"
                >
                  <WhatsAppIcon />
                  {t('cart.orderWhatsapp')}
                </Button>
                <Link to="/productos">
                  <Button variant="ghost" className="w-full" size="md">
                    {t('cart.keepShopping')}
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-[#8e8e9a] text-center leading-relaxed">
                {t('cart.shipping')}<br />
                <span className="text-[10px]">{t('cart.shippingSub')}</span>
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

function LockIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
