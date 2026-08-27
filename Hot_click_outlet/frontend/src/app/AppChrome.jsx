import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useAuthStore, { ADMIN_ROLES } from '@/store/authStore'
import WhatsAppFab from '@/components/ui/WhatsAppFab'
import SocialProofToast from '@/components/ui/SocialProofToast'
import { useSocialProof } from '@/hooks/useSocialProof'
import { productService, normalizeProduct } from '@/services/productService'
import { useAbandonedCart } from '@/hooks/useAbandonedCart'
import { useWishlistAlert } from '@/hooks/useWishlistAlert'
import { useBranding } from '@/hooks/useBranding'
import { initGA4, trackPageView } from '@/utils/ga4'
import { trackAiPage } from '@/components/ai/aiChat/aiChatBehavior'
import { surfaceFromPath } from '@/components/ai/aiChat/chatSurface'
import { esRutaTienda } from '@/utils/rutaTienda'
import { esRutaPrototipo } from '@/utils/rutaPrototipo'
import ChatModal from '@/components/ai/ChatModal'

// Excluded paths — social proof / abandoned-cart watcher skip these
const EXCLUDED_PREFIXES = ['/admin', '/carrito', '/checkout', '/pago', '/tienda', '/prototipo']

// El botón de WhatsApp no aparece en checkout/pago (Brand Book §15.4) ni en flujos de auth
const WAB_HIDDEN_PATHS = new Set(['/login', '/registro', '/carrito', '/checkout'])

/**
 * Scroll al tope y envía pageview de GA4 en cada cambio de ruta.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    globalThis.scrollTo(0, 0)
    trackPageView(pathname)
    if (pathname.startsWith('/admin') || esRutaPrototipo(pathname)) return
    const ficha = pathname.match(/^\/productos\/([^/]+)/)
    trackAiPage(surfaceFromPath(pathname), ficha?.[1])
  }, [pathname])
  return null
}

/**
 * Envuelve las Routes para aplicar fade-in en cada cambio de ruta.
 */
export function PageFade({ children }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} style={{ animation: 'pagefade 0.18s ease both' }}>
      <style>{`@keyframes pagefade { from { opacity:0 } to { opacity:1 } }`}</style>
      {children}
    </div>
  )
}

/**
 * WhatsApp FAB oculto en auth, admin, checkout y pago.
 */
export function ConditionalWhatsAppFab() {
  const { pathname } = useLocation()
  if (WAB_HIDDEN_PATHS.has(pathname)) return null
  if (pathname.startsWith('/admin') || pathname.startsWith('/checkout') || pathname.startsWith('/pago')) return null
  if (esRutaTienda(pathname) || esRutaPrototipo(pathname)) return null
  return <WhatsAppFab />
}

/** Asistente del marketplace: no se abre encima de la tienda de un vendedor. */
export function ConditionalChatModal() {
  const { pathname } = useLocation()
  if (esRutaTienda(pathname) || esRutaPrototipo(pathname)) return null
  return <ChatModal />
}

/**
 * Mounts the abandoned-cart background watcher globally.
 * The hook itself bails out if the cart is empty or was recently sent.
 */
export function AbandonedCartWatcher() {
  useAbandonedCart()
  return null
}

/** Watcher de alerta de wishlist (mismo hook que en App original). */
export function WishlistAlertWatcher() {
  useWishlistAlert()
  return null
}

/**
 * Toast de prueba social en tienda pública; se salta admin y rutas excluidas.
 */
export function SocialProofController() {
  const { pathname } = useLocation()
  const userRole = useAuthStore((s) => s.userRole)
  const [products, setProducts] = useState([])

  const isAdmin    = ADMIN_ROLES.has(userRole)
  const isExcluded = EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (isAdmin || isExcluded) return
    productService.getAll(0, 20)
      .then(({ data }) => {
        const items = (data.content ?? data ?? [])
          .map(normalizeProduct)
          .filter((p) => p.imagenUrl && p.stock > 0)
        setProducts(items)
      })
      .catch((err) => { console.error('[AppChrome] socialProof products', err) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const notification = useSocialProof(isAdmin || isExcluded ? [] : products)

  if (isAdmin || isExcluded) return null
  return <SocialProofToast notification={notification} />
}

/** Aplica branding del tenant al arrancar. */
export function BrandingInit() {
  useBranding()
  return null
}

/** Inicializa GA4 una vez al montar. */
export function AnalyticsInit() {
  useEffect(() => { initGA4() }, [])
  return null
}
