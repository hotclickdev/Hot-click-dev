import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--hc-bg)' }}>
      {/* Header */}
      <header className="h-16 flex items-center px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 hc-logo-badge">
            <span className="text-white font-extrabold text-[13px] tracking-tight leading-none">HC</span>
          </div>
          <span className="font-extrabold text-lg tracking-tight leading-none uppercase hc-logo-text">
            HOTCLICK
          </span>
        </Link>
      </header>

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#4f7cff]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
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
