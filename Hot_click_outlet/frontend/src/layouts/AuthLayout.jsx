import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import BrandLogo from '@/components/ui/BrandLogo'
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--hc-bg)' }}>
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="HotClick — inicio">
          <BrandLogo size={30} wordmarkSize={18} />
        </Link>
      </header>

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[280px] sm:w-[420px] md:w-[600px] h-[280px] sm:h-[420px] md:h-[600px] bg-[#4f7cff]/5 rounded-full blur-[80px] sm:blur-[120px]" />
      </div>

      {/* Center content */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
