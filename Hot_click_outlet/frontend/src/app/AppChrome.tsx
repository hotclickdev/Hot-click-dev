import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import useAuthStore, { ADMIN_ROLES } from '@/store/authStore'
import WhatsAppFab from '@/components/ui/WhatsAppFab'
import SocialProofToast from '@/components/ui/SocialProofToast'
import { useSocialProof } from '@/hooks/useSocialProof'
import { productService } from '@/services/productService'
import { useAbandonedCart } from '@/hooks/useAbandonedCart'
import { useWishlistAlert } from '@/hooks/useWishlistAlert'
import { useBranding } from '@/hooks/useBranding'
import { initAnalytics } from '@/utils/initAnalytics'
import { identifyUser } from '@/utils/analytics'
import { trackPageView } from '@/utils/ga4'
import { trackAiPage } from '@/components/ai/aiChat/aiChatBehavior'
import { surfaceFromPath } from '@/components/ai/aiChat/chatSurface'
import { esRutaTienda } from '@/utils/rutaTienda'
import { esRutaClaudeclick, esRutaPrototipo, esRutaVendedorFigma, esRutaVisitanteFigma } from '@/utils/rutaPrototipo'
import ChatModal from '@/components/ai/ChatModal'
import type { Producto } from '@/types/producto'

const EXCLUDED_PREFIXES = ['/admin', '/carrito', '/checkout', '/pago', '/pos', '/tienda', '/prototipo', '/emprendedor', '/pyme', '/negocio-plus', '/visitante']
const WAB_HIDDEN_PATHS = new Set(['/login', '/registro', '/carrito', '/checkout'])

/**
 * Scroll al tope y envía pageview de GA4 en cada cambio de ruta.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    globalThis.scrollTo(0, 0)
    trackPageView(pathname)
    if (pathname.startsWith('/admin') || pathname.startsWith('/pos') || esRutaClaudeclick(pathname)) return
    const ficha = pathname.match(/^\/productos\/([^/]+)/)
    trackAiPage(surfaceFromPath(pathname), ficha?.[1])
  }, [pathname])
  return null
}

/**
 * Envuelve las Routes para aplicar fade-in en cada cambio de ruta.
 */
export function PageFade({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} style={{ animation: 'pagefade 0.18s ease both' }}>
      <style>{`@keyframes pagefade { from { opacity:0 } to { opacity:1 } }`}</style>
      {children}
    </div>
  )
}

/**
 * WhatsApp FAB oculto en auth, admin, checkout, pago POS y prototipo.
 */
export function ConditionalWhatsAppFab() {
  const { pathname } = useLocation()
  if (WAB_HIDDEN_PATHS.has(pathname)) return null
  if (pathname.startsWith('/admin') || pathname.startsWith('/checkout') || pathname.startsWith('/pago')) return null
  if (pathname.startsWith('/pos')) return null
  if (esRutaTienda(pathname) || esRutaClaudeclick(pathname)) return null
  return <WhatsAppFab />
}

/** Asistente del marketplace: no encima de tienda vendedor, prototipo, ficha ni pago POS. */
export function ConditionalChatModal() {
  const { pathname } = useLocation()
  if (esRutaTienda(pathname) || esRutaClaudeclick(pathname)) return null
  if (pathname.startsWith('/pos')) return null
  if (/^\/productos\/[^/]+/.test(pathname)) return null
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
 * Toast de prueba social en tienda pública; se salta admin, prototipo y rutas excluidas.
 */
export function SocialProofController() {
  const { pathname } = useLocation()
  const userRole = useAuthStore((s) => s.userRole)
  const [products, setProducts] = useState<Producto[]>([])

  const isAdmin = ADMIN_ROLES.has(userRole ?? '')
  const isExcluded = EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p)) || esRutaClaudeclick(pathname)

  useEffect(() => {
    if (isAdmin || isExcluded) return
    productService.getAll(0, 20)
      .then(({ data }) => {
        const pagina = data as { content?: Producto[] } | Producto[]
        const lista = Array.isArray(pagina) ? pagina : pagina.content ?? []
        setProducts(lista.filter(conFotoYStock))
      })
      .catch((err: unknown) => {
        console.error('[AppChrome] socialProof products', err)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const notification = useSocialProof(isAdmin || isExcluded ? [] : products)

  if (isAdmin || isExcluded) return null
  return <SocialProofToast notification={notification} />
}

function conFotoYStock(producto: Producto) {
  return Boolean(producto.imagenUrl) && producto.stock > 0
}

/** Aplica branding del tenant; el prototipo usa tokens de producción. */
export function BrandingInit() {
  const { pathname } = useLocation()
  if (esRutaPrototipo(pathname) || esRutaVendedorFigma(pathname) || esRutaVisitanteFigma(pathname)) return null
  return <BrandingFetch />
}

function BrandingFetch() {
  useBranding()
  return null
}

/** Recarga la app cuando el service worker instala una versión nueva (PWA). */
export function ServiceWorkerRefresh() {
  useEffect(() => {
    function recargar() {
      globalThis.location.reload()
    }
    globalThis.addEventListener('sw-update-available', recargar)
    return () => globalThis.removeEventListener('sw-update-available', recargar)
  }, [])
  return null
}

/** Inicializa GA4 / PostHog / Clarity una vez al montar si hay consentimiento. */
export function AnalyticsInit() {
  useEffect(() => {
    initAnalytics()
    const sesion = useAuthStore.getState()
    identifyUser({
      userId: sesion.userId,
      rol: sesion.userRole,
      empresaId: sesion.empresaId,
    })
  }, [])
  return null
}
