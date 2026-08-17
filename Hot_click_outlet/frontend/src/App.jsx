import { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { ToastProvider } from '@/components/ui/Toast'
import { PageLoader } from '@/components/ui/Spinner'
import PageProgressBar from '@/components/ui/PageProgressBar'
import AccessibilityPanel from '@/components/ui/AccessibilityPanel'
import AuthPromptModal from '@/components/ui/AuthPromptModal'
import ChatModal from '@/components/ai/ChatModal'
import CookieBanner from '@/components/ui/CookieBanner'
import { setAnalyticsConsent } from '@/utils/analytics'
import { initGA4 } from '@/utils/ga4'
import HtmlClassManager from '@/app/HtmlClassManager'
import AppRoutes from '@/app/AppRoutes'
import {
  ScrollToTop,
  PageFade,
  ConditionalWhatsAppFab,
  AbandonedCartWatcher,
  WishlistAlertWatcher,
  SocialProofController,
  BrandingInit,
  AnalyticsInit,
} from '@/app/AppChrome'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

/** Raíz de la SPA: providers, chrome global y árbol de rutas. */
export default function App() {
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrandingInit />
        <AnalyticsInit />
        <HtmlClassManager />
        <BrowserRouter>
          <PageProgressBar />
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
            <PageFade>
            <AppRoutes />
          </PageFade>
          </Suspense>
          <ConditionalWhatsAppFab />
          <AccessibilityPanel />
          <AuthPromptModal />
          <ChatModal />
          <SocialProofController />
          <AbandonedCartWatcher />
          <WishlistAlertWatcher />
          <CookieBanner onConsent={(c) => { setAnalyticsConsent(c.analytics); if (c.analytics) initGA4() }} />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
    </HelmetProvider>
  )
}
