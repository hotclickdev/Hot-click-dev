import { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { ToastProvider } from '@/components/ui/Toast'
import PageProgressBar from '@/components/ui/PageProgressBar'
import { VarianteVisitanteProvider } from '@/components/ui/VarianteVisitanteProvider'
import AccessibilityPanel from '@/components/ui/AccessibilityPanel'
import AccesibilidadFab from '@/components/ui/AccesibilidadFab'
import CookieBanner from '@/components/ui/CookieBanner'
import HojaAgregado from '@/components/comprador/HojaAgregado'
import AvisoSinConexion from '@/components/comprador/estados/AvisoSinConexion'
import { setAnalyticsConsent, identifyUser } from '@/utils/analytics'
import { initAnalytics } from '@/utils/initAnalytics'
import SiteVerification from '@/utils/siteVerification'
import HtmlClassManager from '@/app/HtmlClassManager'
import ConfigMovimiento from '@/app/ConfigMovimiento'
import AppRoutes from '@/app/AppRoutes'
import { MigasProvider } from '@/components/comprador/header/migasContexto'
import ErrorBoundaryPorArea from '@/app/ErrorBoundaryPorArea'
import useAuthStore from '@/store/authStore'
import {
  ScrollToTop,
  PageFade,
  ConditionalWhatsAppFab,
  ConditionalChatModal,
  AbandonedCartWatcher,
  WishlistAlertWatcher,
  BrandingInit,
  AnalyticsInit,
  ServiceWorkerRefresh,
  CargaDeRuta,
} from '@/app/AppChrome'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

/** Raíz de la SPA: providers, chrome global y árbol de rutas. */
export default function App() {
  return (
    <ConfigMovimiento>
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ToastProvider variantePorRuta>
        <AnalyticsInit />
        <ServiceWorkerRefresh />
        <SiteVerification />
        <BrowserRouter>
          {/* Variante Figma de las piezas compartidas solo en rutas del visitante (paneles sin cambios). */}
          <VarianteVisitanteProvider>
          <HtmlClassManager />
          <BrandingInit />
          <PageProgressBar />
          <ScrollToTop />
          <AvisoSinConexion />
          <MigasProvider>
          <Suspense fallback={<CargaDeRuta />}>
            <PageFade>
            <ErrorBoundaryPorArea>
              <AppRoutes />
            </ErrorBoundaryPorArea>
          </PageFade>
          </Suspense>
          </MigasProvider>
          <ConditionalWhatsAppFab />
          <AccesibilidadFab />
          <AccessibilityPanel />
          <ConditionalChatModal />
          <AbandonedCartWatcher />
          <WishlistAlertWatcher />
          <HojaAgregado />
          <CookieBanner onConsent={(c) => {
            setAnalyticsConsent(c.analytics || c.advertising)
            if (!c.analytics && !c.advertising) return
            initAnalytics()
            if (!c.analytics) return
            const sesion = useAuthStore.getState()
            identifyUser({
              userId: sesion.userId,
              rol: sesion.userRole,
              empresaId: sesion.empresaId,
            })
          }} />
          </VarianteVisitanteProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
    </HelmetProvider>
    </ConfigMovimiento>
  )
}
