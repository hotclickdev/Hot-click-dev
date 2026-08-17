import { useState, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { productService, normalizeProduct } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import { abandonedCartService } from '@/services/abandonedCartService'
import AICartSection from '@/components/ai/AICartSection'
import { isValidEmail } from '@/utils/validators'
import AbandonedEmailPrompt from './carrito/AbandonedEmailPrompt'
import AbandonedWaPrompt from './carrito/AbandonedWaPrompt'
import CartEmptyState from './carrito/CartEmptyState'
import CartItemRow from './carrito/CartItemRow'
import CartSummary from './carrito/CartSummary'
import CrossSellGrid from './carrito/CrossSellGrid'
import {
  CROSS_ADDED_FEEDBACK_MS,
  CROSS_SELL_LIMITE,
  EMAIL_GUARDADO_OCULTAR_MS,
  EMAIL_PROMPT_DELAY_MS,
  FALLBACK_CATALOGO_SIZE,
  WA_PROMPT_DELAY_MS,
  emailCarritoYaCapturado,
  guardarEmailCarritoLocal,
  listaProductosDesdeRespuesta,
  seleccionarCrossSell,
  urlWhatsApp,
  whatsappAbandonoDescartado,
} from './carrito/cartHelpers'

async function cargarSugerencias(idsEnCarrito) {
  const { data } = await productService.getDestacados()
  const destacados = listaProductosDesdeRespuesta(data).map(normalizeProduct)
  const filtrados = seleccionarCrossSell(destacados, idsEnCarrito, CROSS_SELL_LIMITE)
  if (filtrados.length > 0) return filtrados
  const { data: catalogo } = await productService.getAll(0, FALLBACK_CATALOGO_SIZE)
  const fallback = listaProductosDesdeRespuesta(catalogo).map(normalizeProduct)
  return seleccionarCrossSell(fallback, idsEnCarrito, CROSS_SELL_LIMITE)
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, total, toWhatsAppMessage, addItem } = useCartStore()
  const { token, user } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const [crossSell, setCrossSell] = useState([])
  const [crossAdded, setCrossAdded] = useState(new Set())
  const [emailPrompt, setEmailPrompt] = useState(false)
  const [capturedEmail, setCapturedEmail] = useState('')
  const [emailSaved, setEmailSaved] = useState(false)
  const [waPrompt, setWaPrompt] = useState(false)
  const promptTimerRef = useRef(null)
  const waTimerRef = useRef(null)
  const totalColones = total()

  useEffect(() => {
    if (token || user || emailCarritoYaCapturado() || items.length === 0) return
    promptTimerRef.current = setTimeout(() => {
      setEmailPrompt(true)
      setWaPrompt(false)
    }, EMAIL_PROMPT_DELAY_MS)
    return () => clearTimeout(promptTimerRef.current)
  }, [token, user, items.length])

  useEffect(() => {
    if (items.length === 0 || whatsappAbandonoDescartado()) return
    waTimerRef.current = setTimeout(() => setWaPrompt(true), WA_PROMPT_DELAY_MS)
    return () => clearTimeout(waTimerRef.current)
  }, [items.length])

  useEffect(() => {
    const idsEnCarrito = new Set(items.map((item) => item.id))
    cargarSugerencias(idsEnCarrito)
      .then(setCrossSell)
      .catch((error) => {
        console.error('No se pudieron cargar sugerencias del carrito', error)
      })
    // Carga una vez al montar, igual que antes (no re-fetch al mutar el carrito).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function guardarEmailAbandono() {
    if (!isValidEmail(capturedEmail)) return
    try {
      await abandonedCartService.saveAbandonedCart(items, capturedEmail)
      guardarEmailCarritoLocal(capturedEmail)
      setEmailSaved(true)
      setTimeout(() => setEmailPrompt(false), EMAIL_GUARDADO_OCULTAR_MS)
    } catch {
      toast({ message: t('common.error'), type: 'error' })
    }
  }

  function agregarSugerencia(product) {
    addItem(product)
    toast({ message: `${product.nombre} añadido`, type: 'success' })
    setCrossAdded((prev) => new Set([...prev, product.id]))
    setTimeout(() => {
      setCrossAdded((prev) => {
        const siguiente = new Set(prev)
        siguiente.delete(product.id)
        return siguiente
      })
    }, CROSS_ADDED_FEEDBACK_MS)
  }

  function abrirWhatsAppPedido() {
    if (items.length === 0) return
    globalThis.open(urlWhatsApp(toWhatsAppMessage()), '_blank')
  }

  function quitarItem(item) {
    removeItem(item.id)
    toast({ message: t('cart.removed', { name: item.nombre }), type: 'info' })
  }

  function vaciarCarrito() {
    clearCart()
    toast({ message: t('cart.cleared'), type: 'info' })
  }

  const crossSellGrid = (
    <CrossSellGrid
      products={crossSell}
      addedIds={crossAdded}
      onAdd={agregarSugerencia}
      variant={items.length === 0 ? 'vacio' : 'lleno'}
    />
  )

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-4 py-16">
          <CartEmptyState />
          {crossSellGrid}
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#e8e8ed]">{t('cart.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">
              {items.length} {items.length === 1 ? t('cart.product') : t('cart.products')}
            </p>
          </div>
          <button type="button"
            onClick={vaciarCarrito}
            className="text-sm text-[#8e8e9a] hover:text-red-400 transition-colors"
          >
            {t('cart.clear')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence>
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onRemove={quitarItem}
                  onUpdateQuantity={updateQuantity}
                />
              ))}
            </AnimatePresence>
          </div>
          <div className="lg:col-span-1">
            <CartSummary
              items={items}
              total={totalColones}
              onCheckout={() => navigate('/checkout')}
              onWhatsApp={abrirWhatsAppPedido}
            />
          </div>
        </div>

        <div className="mt-6">
          <AICartSection cartItems={items} cartTotal={totalColones} />
        </div>

        {crossSellGrid}
      </div>

      <AnimatePresence>
        {waPrompt && (
          <AbandonedWaPrompt
            items={items}
            total={totalColones}
            onDismiss={() => setWaPrompt(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {emailPrompt && (
          <AbandonedEmailPrompt
            email={capturedEmail}
            emailSaved={emailSaved}
            onChangeEmail={setCapturedEmail}
            onSave={guardarEmailAbandono}
            onDismiss={() => setEmailPrompt(false)}
          />
        )}
      </AnimatePresence>
    </MainLayout>
  )
}
