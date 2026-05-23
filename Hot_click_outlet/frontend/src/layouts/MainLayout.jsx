import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import SearchPanel from '@/components/ui/SearchPanel'
import MiniCartDrawer from '@/components/ui/MiniCartDrawer'
import ExitIntentModal from '@/components/ui/ExitIntentModal'
import PromoWelcomePopup from '@/components/ui/PromoWelcomePopup'
import { motion } from 'framer-motion'

export default function MainLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--hc-bg)' }}>
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 12, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 pt-16 pb-20 md:pb-0"
      >
        {children}
      </motion.main>
      <Footer />
      <BottomNav />
      <SearchPanel />
      <MiniCartDrawer />
      <ExitIntentModal />
      <PromoWelcomePopup />
    </div>
  )
}
