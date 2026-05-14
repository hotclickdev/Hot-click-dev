import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import { motion } from 'framer-motion'

export default function MainLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--hc-bg)' }}>
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex-1 pt-16 pb-20 md:pb-0"
      >
        {children}
      </motion.main>
      <Footer />
      <BottomNav />
    </div>
  )
}
