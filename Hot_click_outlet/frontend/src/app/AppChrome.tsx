import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import WhatsAppFab from '@/components/ui/WhatsAppFab'
import { esRutaVisitante, whatsappOculto } from '@/components/ui/flotantes/flotantesHelpers'
import { PageLoader, PageLoaderFigma } from '@/components/ui/Spinner'
import { usePantallaSinConexion } from '@/components/ui/flotantes/pantallaSinConexionStore'
import { useAbandonedCart } from '@/hooks/useAbandonedCart'
import { useWishlistAlert } from '@/hooks/useWishlistAlert'
import { useBranding } from '@/hooks/useBranding'
import { initAnalytics } from '@/utils/initAnalytics'
import { identifyUser, analytics } from '@/utils/analytics'
import { trackPageView } from '@/utils/ga4'
import { captureAttributionFromLocation } from '@/utils/attribution'
import { trackAiPage } from '@/components/ai/aiChat/aiChatBehavior'
import { surfaceFromPath } from '@/components/ai/aiChat/chatSurface'
import { esRutaTienda } from '@/utils/rutaTienda'
import { esRutaClaudeclick, esRutaPrototipo, esRutaVendedorFigma, esRutaVisitanteFigma } from '@/utils/rutaPrototipo'
import ChatModal from '@/components/ai/ChatModal'
import { cambiaDePagina, destinoScroll, guardarPosicion, irAPosicion, posicionGuardada } from '@/app/restauracionScroll'


/**
 * Scroll en cada cambio de ruta: un enlace nuevo empieza arriba y «Atrás»/«Adelante» vuelve a la posición
 * que tenía esa entrada del historial (antes siempre iba al tope y el catálogo perdía el lugar al volver de la ficha).
 * También envía el pageview de GA4.
 */
export function ScrollToTop() {
  const { pathname, search, key } = useLocation()
  const tipo = useNavigationType()
  const claveActual = useRef(key)
  const urlActual = useRef<string | null>(null)
  const cancelarScroll = useRef<() => void>(() => undefined)

  // La restauración nativa llega antes de que la página tenga su alto final (datos asíncronos): la hacemos acá.
  // La posición se toma al decidir irse (clic o atrás/adelante, en captura) y no al scrollear: el router cambia de
  // página dentro de una transición y, si la página nueva es más corta, el recorte del scroll se guardaría como propio.
  useEffect(() => {
    const { history } = globalThis
    const anterior = history.scrollRestoration
    history.scrollRestoration = 'manual'
    const guardar = () => guardarPosicion(claveActual.current, globalThis.scrollY)
    globalThis.addEventListener('click', guardar, true)
    globalThis.addEventListener('popstate', guardar, true)
    return () => {
      history.scrollRestoration = anterior
      globalThis.removeEventListener('click', guardar, true)
      globalThis.removeEventListener('popstate', guardar, true)
    }
  }, [])

  useEffect(() => {
    claveActual.current = key
    const url = `${pathname}${search}`
    if (!cambiaDePagina(tipo, url, urlActual.current)) return
    urlActual.current = url
    cancelarScroll.current()
    cancelarScroll.current = irAPosicion(destinoScroll(tipo, posicionGuardada(key)))
  }, [key, tipo, pathname, search])

  useEffect(() => () => cancelarScroll.current(), [])

  useEffect(() => {
    captureAttributionFromLocation(search, pathname)
    trackPageView(pathname)
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/pos')) analytics.visita()
    if (pathname.startsWith('/admin') || pathname.startsWith('/pos') || esRutaClaudeclick(pathname)) return
    const ficha = pathname.match(/^\/productos\/([^/]+)/)
    trackAiPage(surfaceFromPath(pathname), ficha?.[1])
  }, [pathname, search])
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
 * WhatsApp FAB oculto en auth, admin, checkout, pago POS, prototipo y Sin conexión (`45:2264`).
 * El Home normal (`/`) no entra en esa última condición.
 */
export function ConditionalWhatsAppFab() {
  const { pathname } = useLocation()
  const pantallaSinConexion = usePantallaSinConexion()
  if (whatsappOculto(pathname, esRutaTienda(pathname), esRutaClaudeclick(pathname), pantallaSinConexion)) return null
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

/** Banner para aplicar update del SW sin reload silencioso mid-wizard. */
export function ServiceWorkerRefresh() {
  const [disponible, setDisponible] = useState(false)
  // Está fuera del BrowserRouter: la ruta se lee del navegador cuando llega el aviso.
  const pathname = globalThis.location?.pathname ?? '/'

  useEffect(() => {
    function avisar() {
      setDisponible(true)
    }
    globalThis.addEventListener('sw-update-available', avisar)
    return () => globalThis.removeEventListener('sw-update-available', avisar)
  }, [])

  if (!disponible) return null

  if (esRutaVisitante(pathname, esRutaClaudeclick(pathname))) {
    // Visitante con sesión (sin sesión se actualiza solo): aviso claro derivado de Figma `29:2036`. ⚠️ COMPARTIDO.
    return (
      <div role="status" className="fixed bottom-20 left-1/2 z-[60] flex w-[min(92vw,24rem)] -translate-x-1/2 flex-col gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px] leading-[normal] shadow-[0_8px_24px_rgba(20,23,28,0.12)] md:bottom-6">
        <p className="text-[14px] font-semibold text-hc-n-900">Hay una versión nueva de HotClick.</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-[12px] bg-hc-red-500 px-3 py-[12px] text-[14px] font-semibold text-hc-n-0"
            onClick={() => {
              void import('@/app/swUpdate').then(({ aplicarSwUpdate }) => aplicarSwUpdate(true))
            }}
          >
            Actualizar
          </button>
          <button
            type="button"
            className="flex-1 rounded-[12px] border border-hc-n-200 px-3 py-[11px] text-[14px] font-semibold text-hc-n-900"
            onClick={() => setDisponible(false)}
          >
            Ahora no
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-20 left-1/2 z-[60] flex w-[min(92vw,24rem)] -translate-x-1/2 flex-col gap-2 rounded-xl border border-hc-border bg-hc-surface p-3 shadow-lg md:bottom-6"
      role="status"
    >
      <p className="text-sm font-medium text-hc-text">Hay una versión nueva de HotClick.</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="min-h-11 flex-1 rounded-[14px] bg-hc-primary px-3 text-sm font-bold text-white"
          onClick={() => {
            void import('@/app/swUpdate').then(({ aplicarSwUpdate }) => aplicarSwUpdate(true))
          }}
        >
          Actualizar
        </button>
        <button
          type="button"
          className="min-h-11 flex-1 rounded-[14px] border border-hc-border px-3 text-sm font-medium text-hc-muted"
          onClick={() => setDisponible(false)}
        >
          Ahora no
        </button>
      </div>
    </div>
  )
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

/** Fallback de `Suspense`: visitante con la espera de Figma, paneles y landings con el `PageLoader` de siempre. */
export function CargaDeRuta() {
  const { pathname } = useLocation()
  return esRutaVisitante(pathname, esRutaClaudeclick(pathname)) ? <PageLoaderFigma /> : <PageLoader />
}
