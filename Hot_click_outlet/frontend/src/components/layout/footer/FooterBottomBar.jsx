import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export default function FooterBottomBar({ year }) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mt-10 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left"
      style={{ borderTop: '1px solid var(--hc-border)' }}
    >
      <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 order-3 sm:order-1 text-center sm:text-left">
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          © {year} HotClick · {t('footer.derechos')}
        </p>
        <div className="hidden sm:block text-xs" style={{ color: 'var(--hc-border)' }}>·</div>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {['/privacidad', '/terminos', '/devoluciones', '/envios'].map((path) => (
            <Link key={path} to={path} className="text-xs transition-colors hover:opacity-80" style={{ color: 'var(--hc-muted)', textDecoration: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--hc-text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--hc-muted)' }}>
              {path === '/privacidad' && 'Privacidad'}
              {path === '/terminos' && 'Términos'}
              {path === '/devoluciones' && 'Devoluciones'}
              {path === '/envios' && 'Envíos'}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 order-2">
        <span className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{ color: 'var(--hc-muted)' }}>
          Aceptamos
        </span>
        <div className="flex items-center justify-center px-2.5 py-1.5 rounded-lg"
          style={{ background: '#1a1f71', border: '1px solid rgba(255,255,255,0.12)', minWidth: 44 }}>
          <svg viewBox="0 0 50 16" width="36" height="12" fill="none">
            <text x="0" y="13" fontSize="14" fontWeight="900" fontFamily="'Arial Black', sans-serif" fill="white" letterSpacing="-0.5">VISA</text>
          </svg>
        </div>
        <div className="flex items-center justify-center px-2 py-1.5 rounded-lg"
          style={{ background: '#252525', border: '1px solid rgba(255,255,255,0.12)', minWidth: 44 }}>
          <svg viewBox="0 0 38 24" width="38" height="20" fill="none">
            <circle cx="14" cy="12" r="10" fill="#EB001B" />
            <circle cx="24" cy="12" r="10" fill="#F79E1B" />
            <path d="M19 4.8a10 10 0 0 1 0 14.4A10 10 0 0 1 19 4.8z" fill="#FF5F00" />
          </svg>
        </div>
        <div className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg"
          style={{ background: '#003d1f', border: '1px solid rgba(52,211,153,0.3)', minWidth: 52 }}>
          <svg viewBox="0 0 10 14" width="8" height="11" fill="none">
            <rect x="1" y="0" width="8" height="14" rx="1.5" stroke="#34d399" strokeWidth="1.2" />
            <rect x="3" y="2" width="4" height="1" rx="0.5" fill="#34d399" />
            <circle cx="5" cy="11" r="1" fill="#34d399" />
          </svg>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#34d399', letterSpacing: '0.03em', fontFamily: 'sans-serif' }}>SINPE</span>
        </div>
      </div>

      <p className="text-xs flex items-center gap-1.5 order-1 sm:order-3" style={{ color: 'var(--hc-muted)' }}>
        Hecho con amor en Costa Rica <span className="text-base">🇨🇷</span>
      </p>
    </motion.div>
  )
}
