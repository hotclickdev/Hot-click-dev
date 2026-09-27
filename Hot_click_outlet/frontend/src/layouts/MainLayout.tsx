import type { ReactNode } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import SearchPanel from '@/components/ui/SearchPanel'
import MiniCartDrawer from '@/components/ui/MiniCartDrawer'
import ExitIntentModal from '@/components/ui/ExitIntentModal'
import PromoWelcomePopup from '@/components/ui/PromoWelcomePopup'
import ReturnVisitorBanner from '@/components/ui/ReturnVisitorBanner'
import { motion } from 'framer-motion'

type MainLayoutProps = {
  children?: ReactNode
  /** En móvil la página trae su propia barra (carrito y compra): sin header, barra inferior ni footer. */
  barraMovilPropia?: boolean
}

export default function MainLayout({ children, barraMovilPropia = false }: MainLayoutProps) {
  const soloDesktop = barraMovilPropia ? 'max-lg:hidden' : undefined
  const espaciado = barraMovilPropia ? 'lg:pt-16' : 'pt-16 pb-20 md:pb-0'
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden" style={{ backgroundColor: 'var(--hc-bg)' }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--hc-accent)] focus:text-white focus:text-sm focus:font-semibold"
      >
        Saltar al contenido
      </a>
      <div className={soloDesktop}>
        <Navbar />
      </div>
      <motion.main
        id="main-content"
        initial={{ opacity: 0, y: 12, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`flex-1 ${espaciado}`}
        tabIndex={-1}
      >
        <ReturnVisitorBanner />
        {children}
      </motion.main>
      <div className={soloDesktop}>
        <Footer />
        <BottomNav />
      </div>
      <SearchPanel />
      <MiniCartDrawer />
      <ExitIntentModal />
      <PromoWelcomePopup />
    </div>
  )
}
