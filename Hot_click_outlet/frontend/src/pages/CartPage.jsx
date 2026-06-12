import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Button from '@/components/ui/Button'
import ShippingProgress from '@/components/ui/ShippingProgress'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'
import { productService, normalizeProduct } from '@/services/productService'
import { formatPrice } from '@/utils/format'
import { useToast } from '@/components/ui/Toast'
import { abandonedCartService } from '@/services/abandonedCartService'
import AICartSection from '@/components/ai/AICartSection'

const WHATSAPP = '50689745370'
const EMAIL_PROMPT_DELAY_MS = 45_000  // 45 segundos
const WA_PROMPT_DELAY_MS    = 30_000  // 30 segundos

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, total, toWhatsAppMessage, addItem } = useCartStore()
  const { token, user } = useAuthStore()
  const { setAuthPromptOpen } = useUiStore()
  const navigate  = useNavigate()
  const toast     = useToast()
  const { t } = useTranslation()
  const [crossSell, setCrossSell] = useState([])
  const [crossAdded, setCrossAdded] = useState(new Set())
  const [emailPrompt, setEmailPrompt] = useState(false)
  const [capturedEmail, setCapturedEmail] = useState('')
  const [emailSaved, setEmailSaved] = useState(false)
  const [waPrompt, setWaPrompt] = useState(false)
  const promptTimerRef = useRef(null)
  const waTimerRef     = useRef(null)

  // Mostrar prompt de email a usuarios anónimos después de 45 s
  useEffect(() => {
    const alreadyCaptured = localStorage.getItem('hc-cart-email')
    if (token || user || alreadyCaptured || items.length === 0) return
    promptTimerRef.current = setTimeout(() => { setEmailPrompt(true); setWaPrompt(false) }, EMAIL_PROMPT_DELAY_MS)
    return () => clearTimeout(promptTimerRef.current)
  }, [token, user, items.length])

  // Agente de carrito abandonado — WhatsApp (todos los usuarios, 30 s)
  useEffect(() => {
    const dismissed = sessionStorage.getItem('hc-cart-wa-dismissed')
    if (items.length === 0 || dismissed) return
    waTimerRef.current = setTimeout(() => setWaPrompt(true), WA_PROMPT_DELAY_MS)
    return () => clearTimeout(waTimerRef.current)
  }, [items.length])

  const handleEmailSave = () => {
    if (!capturedEmail.includes('@')) return
    localStorage.setItem('hc-cart-email', capturedEmail)
    abandonedCartService.saveAbandonedCart(items, capturedEmail).catch(() => {})
    setEmailSaved(true)
    setTimeout(() => setEmailPrompt(false), 1800)
  }

  function buildAbandonedMsg() {
    const lines = items.map(i =>
      `  • ${i.nombre ?? i.nombreProducto} x${i.cantidad} — ₡${((i.precio ?? i.precioVenta ?? 0) * i.cantidad).toLocaleString('es-CR')}`
    )
    return encodeURIComponent(
      `Hola! 😊 Dejé estos artículos en mi carrito de HotClick:\n\n${lines.join('\n')}\n\n` +
      `💰 Total: ₡${total().toLocaleString('es-CR')}\n\n` +
      `¿Me ayudan a completar la compra cuando pueda? Muchas gracias 🙏`
    )
  }

  useEffect(() => {
    const cartIds = new Set(items.map((i) => i.id))
    productService.getDestacados()
      .then(({ data }) => {
        const all = (Array.isArray(data) ? data : data?.content ?? []).map(normalizeProduct)
        const filtered = all.filter((p) => !cartIds.has(p.id) && p.stock > 0).slice(0, 4)
        if (filtered.length > 0) {
          setCrossSell(filtered)
        } else {
          return productService.getAll(0, 12).then(({ data: d }) => {
            const fallback = (d.content ?? d ?? []).map(normalizeProduct)
            setCrossSell(fallback.filter((p) => !cartIds.has(p.id) && p.stock > 0).slice(0, 4))
          })
        }
      })
      .catch(() => {})
  }, [])

  const handleCrossAdd = (product) => {
    addItem(product)
    toast({ message: `${product.nombre} añadido`, type: 'success' })
    setCrossAdded((prev) => new Set([...prev, product.id]))
    setTimeout(() => {
      setCrossAdded((prev) => { const n = new Set(prev); n.delete(product.id); return n })
    }, 1400)
  }

  const handleWhatsApp = () => {
    if (items.length === 0) return
    const msg = toWhatsAppMessage()
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
  }

  const handleCotizacion = () => {
    if (items.length === 0) return
    const lines = items.map((i) => `  • ${i.nombre} ×${i.cantidad} — ${formatPrice(i.precio * i.cantidad)}`)
    const text = encodeURIComponent(
      `Hola Andrés! 👋 Quisiera una *cotización* para los siguientes productos:\n\n` +
      lines.join('\n') +
      `\n\n💰 Total estimado: *${formatPrice(total())}*\n\n` +
      `¿Me podés confirmar disponibilidad, tiempo de entrega y formas de pago? Gracias 😊`
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
        <div className="max-w-3xl mx-auto px-4 py-16">
          {/* Estado vacío */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5 text-center"
          >
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-3xl" style={{ background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 16%, transparent)' }} />
              <div className="absolute inset-0 rounded-3xl blur-2xl opacity-30" style={{ background: 'var(--hc-accent)' }} />
              <svg className="relative w-14 h-14 text-[#4f7cff]" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 001.95 1.61h9.72a2 2 0 001.95-1.61L23 6H6" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--hc-text)' }}>{t('cart.empty')}</h1>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>{t('cart.emptySub')}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-1">
              <Link
                to="/productos"
                className="px-6 py-2.5 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-medium text-sm transition-all shadow-[0_0_20px_rgba(23,71,168,0.25)] hover:shadow-[0_0_32px_rgba(23,71,168,0.4)]"
              >
                {t('cart.explore')}
              </Link>
              <Link
                to="/wishlist"
                className="px-6 py-2.5 rounded-xl border text-sm font-medium transition-all hover:bg-white/5"
                style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}
              >
                {t('nav.wishlist')}
              </Link>
            </div>
          </motion.div>

          {/* Sugerencias de compra */}
          {crossSell.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mt-14"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1" style={{ background: 'var(--hc-border)' }} />
                <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--hc-muted)' }}>
                  Te puede interesar
                </h2>
                <div className="h-px flex-1" style={{ background: 'var(--hc-border)' }} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {crossSell.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="group rounded-2xl overflow-hidden"
                    style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                  >
                    <div
                      className="h-28 bg-[#1a1a1f] flex items-center justify-center overflow-hidden cursor-pointer"
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
                        <span className="text-3xl opacity-20">📦</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p
                        className="text-xs font-medium line-clamp-2 mb-1.5 cursor-pointer"
                        style={{ color: 'var(--hc-text)' }}
                        onClick={() => navigate(`/productos/${product.id}`)}
                      >
                        {product.nombre}
                      </p>
                      <p className="text-sm font-bold text-[#4f7cff] mb-2">{formatPrice(product.precio)}</p>
                      <button
                        onClick={() => handleCrossAdd(product)}
                        className={`w-full h-7 rounded-lg text-xs font-medium transition-all duration-200 ${
                          crossAdded.has(product.id)
                            ? 'bg-emerald-500 text-white'
                            : 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white'
                        }`}
                      >
                        {crossAdded.has(product.id) ? '✓ Añadido' : '+ Agregar'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#e8e8ed]">{t('cart.title')}</h1>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
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
              className="sticky top-24 bg-[#111114] border border-white/8 rounded-2xl p-4 pr-16 sm:p-6 sm:pr-6 space-y-3 sm:space-y-4"
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
                <Button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-[#4f7cff] hover:bg-[#3d6ee0] shadow-[0_0_20px_rgba(23,71,168,0.3)]"
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

        {/* ── Agente del carrito ── */}
        <div className="mt-6">
          <AICartSection cartItems={items} cartTotal={total()} />
        </div>

        {/* ── Cross-sell: Completa tu compra ── */}
        {crossSell.length > 0 && (
          <div className="mt-5 sm:mt-10">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-semibold text-[#e8e8ed]">Completa tu compra</h2>
              <span className="text-xs text-[#8e8e9a]">Productos que podrían interesarte</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {crossSell.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="group rounded-2xl overflow-hidden"
                  style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                >
                  <div
                    className="h-28 bg-[#1a1a1f] flex items-center justify-center overflow-hidden cursor-pointer"
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
                      <span className="text-3xl opacity-20">📦</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p
                      className="text-xs font-medium line-clamp-2 mb-1.5 cursor-pointer"
                      style={{ color: 'var(--hc-text)' }}
                      onClick={() => navigate(`/productos/${product.id}`)}
                    >
                      {product.nombre}
                    </p>
                    <p className="text-sm font-bold text-[#4f7cff] mb-2">{formatPrice(product.precio)}</p>
                    <button
                      onClick={() => handleCrossAdd(product)}
                      className={`w-full h-7 rounded-lg text-xs font-medium transition-all duration-200 ${
                        crossAdded.has(product.id)
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[#4f7cff] hover:bg-[#3d6ee0] text-white'
                      }`}
                    >
                      {crossAdded.has(product.id) ? '✓ Añadido' : '+ Agregar'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Agente HotClick AI — carrito abandonado → WhatsApp ── */}
      <AnimatePresence>
        {waPrompt && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          >
            <div
              className="rounded-2xl px-5 py-4 shadow-2xl"
              style={{
                background: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              }}
            >
              <button
                onClick={() => { setWaPrompt(false); sessionStorage.setItem('hc-cart-wa-dismissed', '1') }}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg text-[#8e8e9a] hover:text-white transition-colors hover:bg-white/8"
                aria-label="Cerrar"
              >✕</button>

              {/* Avatar + mensaje del agente */}
              <div className="flex gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5"
                  style={{ background: 'var(--hc-accent)', color: '#fff' }}
                >✦</div>
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--hc-text)' }}>HotClick AI</p>
                  <p className="text-sm leading-snug" style={{ color: 'var(--hc-muted)' }}>
                    Tenés {items.length} producto{items.length !== 1 ? 's' : ''} en tu carrito.
                    {' '}¿Te enviamos todo por WhatsApp para retomarlo cuando quieras? Disculpá las molestias.
                  </p>
                </div>
              </div>

              <a
                href={`https://wa.me/${WHATSAPP}?text=${buildAbandonedMsg()}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { setWaPrompt(false); sessionStorage.setItem('hc-cart-wa-dismissed', '1') }}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 active:scale-95"
                style={{ background: '#25D366', color: '#fff' }}
              >
                <WhatsAppIcon />
                Enviar carrito por WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Email capture para carrito abandonado (usuarios anónimos) ── */}
      <AnimatePresence>
        {emailPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          >
            <div
              className="rounded-2xl px-5 py-4 shadow-2xl"
              style={{
                background: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              }}
            >
              <button
                onClick={() => setEmailPrompt(false)}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg text-[#8e8e9a] hover:text-white transition-colors hover:bg-white/8"
              >
                ✕
              </button>
              {emailSaved ? (
                <div className="flex items-center gap-3 py-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#e8e8ed]">¡Listo!</p>
                    <p className="text-xs text-[#8e8e9a]">Te avisamos si tu carrito sigue aquí.</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[#e8e8ed] mb-1">¿Te vas? Guarda tu carrito</p>
                  <p className="text-xs text-[#8e8e9a] mb-3">
                    Déjanos tu email y te enviamos un link para continuar cuando quieras.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={capturedEmail}
                      onChange={(e) => setCapturedEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailSave()}
                      placeholder="tu@email.com"
                      className="flex-1 h-9 px-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: 'var(--hc-bg)',
                        border: '1px solid var(--hc-border)',
                        color: 'var(--hc-text)',
                      }}
                    />
                    <button
                      onClick={handleEmailSave}
                      className="px-4 h-9 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95 shrink-0"
                      style={{ background: 'var(--hc-accent)' }}
                    >
                      Guardar
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
