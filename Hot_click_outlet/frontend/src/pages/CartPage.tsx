import { useState, useEffect, useRef, type ComponentType } from 'react'
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
import CheckoutStepper from '@/components/ui/CheckoutStepper'
import { isValidEmail } from '@/utils/validators'
import type { Producto } from '@/types/producto'
import type { ItemCarrito } from '@/types/carrito'
import type { Id } from '@/types/api'
import AbandonedEmailPrompt from './carrito/AbandonedEmailPrompt'
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
  emailCarritoYaCapturado,
  guardarEmailCarritoLocal,
  listaProductosDesdeRespuesta,
  seleccionarCrossSell,
  urlWhatsApp,
} from './carrito/cartHelpers'

const AICartSectionTyped = AICartSection as ComponentType<{
  cartItems: ItemCarrito[]
  cartTotal: number
}>

async function cargarSugerencias(idsEnCarrito: Set<Producto['id']>): Promise<Producto[]> {
  const { data } = await productService.getDestacados()
  const destacados = listaProductosDesdeRespuesta(data)
    .map((item) => normalizeProduct(item))
    .filter((p): p is Producto => p != null)
  const filtrados = seleccionarCrossSell(destacados, idsEnCarrito, CROSS_SELL_LIMITE)
  if (filtrados.length > 0) return filtrados
  const { data: catalogo } = await productService.getAll(0, FALLBACK_CATALOGO_SIZE)
  const fallback = listaProductosDesdeRespuesta(catalogo)
    .map((item) => normalizeProduct(item))
    .filter((p): p is Producto => p != null)
  return seleccionarCrossSell(fallback, idsEnCarrito, CROSS_SELL_LIMITE)
}

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const total = useCartStore((s) => s.total)
  const toWhatsAppMessage = useCartStore((s) => s.toWhatsAppMessage)
  const addItem = useCartStore((s) => s.addItem)
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const [crossSell, setCrossSell] = useState<Producto[]>([])
  const [crossAdded, setCrossAdded] = useState<Set<Producto['id']>>(new Set())
  const [emailPrompt, setEmailPrompt] = useState(false)
  const [capturedEmail, setCapturedEmail] = useState('')
  const [emailSaved, setEmailSaved] = useState(false)
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const totalColones = total()

  useEffect(() => {
    if (token || emailCarritoYaCapturado() || items.length === 0) return
    promptTimerRef.current = setTimeout(() => setEmailPrompt(true), EMAIL_PROMPT_DELAY_MS)
    return () => clearTimeout(promptTimerRef.current ?? undefined)
  }, [token, items.length])

  useEffect(() => {
    const idsEnCarrito = new Set(items.map((item) => item.id))
    cargarSugerencias(idsEnCarrito)
      .then(setCrossSell)
      .catch((error: unknown) => {
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

  function agregarSugerencia(product: Producto) {
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

  function quitarItem(item: ItemCarrito) {
    removeItem(item.id as Id, item.cartLineId)
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
        <CheckoutStepper activeStep="cart" />
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-hc-text">{t('cart.title')}</h1>
            <p className="text-sm text-hc-muted mt-1">
              {items.length} {items.length === 1 ? t('cart.product') : t('cart.products')}
            </p>
          </div>
          <button type="button"
            onClick={vaciarCarrito}
            className="text-sm text-hc-muted hover:text-red-400 transition-colors"
          >
            {t('cart.clear')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence>
              {items.map((item) => (
                <CartItemRow
                  key={item.cartLineId || String(item.id)}
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
          <AICartSectionTyped cartItems={items} cartTotal={totalColones} />
        </div>

        {crossSellGrid}
      </div>

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
